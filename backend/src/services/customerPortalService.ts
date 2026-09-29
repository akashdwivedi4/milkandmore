import crypto from 'crypto';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { Customer, ICustomer } from '../models/Customer';
import { CustomerOtp } from '../models/CustomerOtp';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { Business } from '../models/Business';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { getTodayDateString } from '../utils/date';

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_COOLDOWN_MS = 60 * 1000;   // 60 seconds
export const MAX_OTP_ATTEMPTS = 3;

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

export function generateCryptoToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 hex characters
}

export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 2) return 'ending in **';
  const last2 = clean.slice(-2);
  return `ending in ${last2}`;
}

export function signCustomerPortalSession(
  customerId: string,
  businessId: string,
  portalToken: string,
  expiresIn: string = '24h'
): string {
  return jwt.sign(
    {
      customerId,
      businessId,
      portalToken,
      role: 'CUSTOMER_PORTAL',
    },
    env.JWT_SECRET,
    { expiresIn } as any
  );
}

/**
 * Ensures customer has an active customerPortalToken. Generates one if missing.
 */
export async function ensureCustomerPortalToken(customer: ICustomer): Promise<string> {
  if (customer.customerPortalToken && !customer.portalTokenRevoked) {
    return customer.customerPortalToken;
  }
  const newToken = generateCryptoToken();
  customer.customerPortalToken = newToken;
  customer.portalTokenCreatedAt = new Date();
  customer.portalTokenRevoked = false;
  await customer.save();
  return newToken;
}

/**
 * 1. Verify Info (unauthenticated): Returns only masked phone and business name. Zero PII.
 */
export async function getVerifyInfo(portalToken: string): Promise<{
  valid: boolean;
  maskedMobile: string;
  businessName: string;
  token: string;
}> {
  if (!portalToken || typeof portalToken !== 'string' || !portalToken.trim()) {
    throw new AppError("We couldn't verify this QR code.", 404);
  }

  const cleanToken = portalToken.trim();
  const customer = await Customer.findOne({
    customerPortalToken: cleanToken,
    portalTokenRevoked: { $ne: true },
    isDeleted: false,
  });

  if (!customer) {
    // Privacy-safe generic error
    throw new AppError("We couldn't verify this QR code.", 404);
  }

  const business = await Business.findById(customer.businessId);

  return {
    valid: true,
    maskedMobile: maskPhone(customer.mobile),
    businessName: business?.name || 'Milk & More Dairy',
    token: cleanToken,
  };
}

/**
 * 2. Request OTP: Rate-limited, generates crypto OTP, stores SHA-256 hash. Never returns OTP.
 */
export async function requestOtp(portalToken: string): Promise<{
  success: boolean;
  message: string;
  cooldownSeconds: number;
}> {
  if (!portalToken || typeof portalToken !== 'string') {
    throw new AppError("We couldn't verify this QR code.", 404);
  }

  const cleanToken = portalToken.trim();
  const customer = await Customer.findOne({
    customerPortalToken: cleanToken,
    portalTokenRevoked: { $ne: true },
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError("We couldn't verify this QR code.", 404);
  }

  const now = new Date();

  // Check recent OTP for cooldown
  const latestOtp = await CustomerOtp.findOne({
    portalToken: cleanToken,
    customerId: customer._id,
  }).sort({ createdAt: -1 });

  if (latestOtp && latestOtp.resendCooldownUntil > now) {
    const remainingSeconds = Math.ceil(
      (latestOtp.resendCooldownUntil.getTime() - now.getTime()) / 1000
    );
    throw new AppError(
      `Please wait ${remainingSeconds} second(s) before requesting another OTP.`,
      429
    );
  }

  // Generate 6-digit OTP
  const rawOtp = generateNumericOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
  const resendCooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_MS);

  // Invalidate any previously unused OTPs for this token
  await CustomerOtp.updateMany(
    { portalToken: cleanToken, isUsed: false },
    { $set: { isUsed: true } }
  );

  await CustomerOtp.create({
    customerId: customer._id,
    businessId: customer.businessId,
    portalToken: cleanToken,
    otpHash,
    expiresAt,
    attemptsCount: 0,
    maxAttempts: MAX_OTP_ATTEMPTS,
    isUsed: false,
    resendCooldownUntil,
  });

  // In test environment only: allow test suite to inspect mock OTP via global hook
  if (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') {
    (global as any).__LAST_TEST_OTP__ = rawOtp;
  }

  // NOTE: rawOtp is NEVER logged or returned in the API response!
  return {
    success: true,
    message: `OTP will be sent to your registered mobile number ${maskPhone(customer.mobile)}.`,
    cooldownSeconds: 60,
  };
}

/**
 * 3. Verify OTP: Verifies hash, checks attempts, marks used, creates customer portal session.
 */
export async function verifyOtp(
  portalToken: string,
  otp: string
): Promise<{
  success: boolean;
  sessionToken: string;
  message: string;
}> {
  if (!portalToken || !otp) {
    throw new AppError('QR token and OTP are required.', 400);
  }

  const cleanToken = portalToken.trim();
  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new AppError('OTP must be a 6-digit number.', 400);
  }

  const customer = await Customer.findOne({
    customerPortalToken: cleanToken,
    portalTokenRevoked: { $ne: true },
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError("We couldn't verify this QR code.", 404);
  }

  const now = new Date();

  // Find latest OTP record for this portal token
  const otpRecord = await CustomerOtp.findOne({
    portalToken: cleanToken,
    customerId: customer._id,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError('No active OTP request found. Please request a new OTP.', 400);
  }

  // Check if max attempts reached (locks with 429)
  if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
    throw new AppError(
      'Maximum incorrect OTP attempts exceeded. Please request a new OTP.',
      429
    );
  }

  // Check if already used (single use enforcement)
  if (otpRecord.isUsed) {
    throw new AppError('This OTP has already been used. Please request a new OTP.', 400);
  }

  // Check if expired
  if (otpRecord.expiresAt < now) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  // Verify hash
  const inputHash = hashOtp(cleanOtp);
  if (inputHash !== otpRecord.otpHash) {
    otpRecord.attemptsCount += 1;
    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      throw new AppError(
        'Maximum incorrect OTP attempts exceeded. Please request a new OTP.',
        429
      );
    }
    await otpRecord.save();
    const remaining = otpRecord.maxAttempts - otpRecord.attemptsCount;
    throw new AppError(`Invalid OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  // Successful verification
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Sign secure session token
  const sessionToken = signCustomerPortalSession(
    customer._id.toString(),
    customer.businessId.toString(),
    cleanToken,
    '24h'
  );

  return {
    success: true,
    sessionToken,
    message: 'Verification successful.',
  };
}

/**
 * 4. Get Customer Portal Profile & Data
 */
export async function getCustomerProfile(customerId: string, businessId: string) {
  const customer = await Customer.findOne({
    _id: new Types.ObjectId(customerId),
    businessId: new Types.ObjectId(businessId),
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError('Customer account not found.', 404);
  }

  const business = await Business.findById(customer.businessId);

  return {
    id: customer._id.toString(),
    formattedCustomerId: `#CUST-${customer._id.toString().slice(-4).toUpperCase()}`,
    name: customer.name,
    maskedMobile: maskPhone(customer.mobile),
    address: customer.address || '',
    locality: customer.locality || '',
    city: customer.city || '',
    state: customer.state || '',
    customerSince: customer.customerSince?.toISOString().split('T')[0],
    status: customer.status,
    business: {
      name: business?.name || 'Milk & More Dairy',
      phone: business?.mobile || '',
      email: business?.email || '',
      address: business?.address || '',
    },
  };
}

/**
 * 5. Get Today Delivery Status for Customer
 */
export async function getTodayDelivery(customerId: string, businessId: string) {
  const todayStr = getTodayDateString();
  const deliveries = await Delivery.find({
    customerId: new Types.ObjectId(customerId),
    businessId: new Types.ObjectId(businessId),
    deliveryDate: todayStr,
  }).sort({ createdAt: -1 });

  const delivered = deliveries.length > 0;
  const morning = deliveries.find((d) => d.shift === 'MORNING');
  const evening = deliveries.find((d) => d.shift === 'EVENING');

  // Format delivery summary text
  let summaryText = 'Today\'s delivery has not been recorded yet.';
  if (deliveries.length > 0) {
    const latest = deliveries[0];
    const itemsStr = latest.items?.map((it: any) => `${it.productName || 'Milk'} — ${it.quantity} ${it.unit || 'L'}`).join(', ');
    const shiftStr = latest.shift === 'EVENING' ? 'Evening' : 'Morning';
    summaryText = `${itemsStr || 'Delivery'} — ${shiftStr}`;
  }

  return {
    date: todayStr,
    delivered,
    summaryText,
    morning: morning ? { delivered: true, shift: 'Morning', delivery: morning } : null,
    evening: evening ? { delivered: true, shift: 'Evening', delivery: evening } : null,
    deliveries,
  };
}

/**
 * 6. Get Delivery History
 */
export async function getDeliveryHistory(customerId: string, businessId: string, limit: number = 30) {
  const deliveries = await Delivery.find({
    customerId: new Types.ObjectId(customerId),
    businessId: new Types.ObjectId(businessId),
  })
    .sort({ deliveryDate: -1, createdAt: -1 })
    .limit(limit);

  // Flatten items for clean customer presentation
  const flatItems: any[] = [];
  deliveries.forEach((d) => {
    (d.items || []).forEach((it: any) => {
      flatItems.push({
        deliveryId: d._id.toString(),
        date: d.deliveryDate,
        shift: d.shift === 'EVENING' ? 'Evening' : 'Morning',
        item: it.productName || 'Milk',
        quantity: it.quantity,
        unit: it.unit || 'L',
        rate: it.rate,
        amount: it.amount,
        isAdditional: d.isAdditional,
      });
    });
  });

  return {
    totalDeliveries: deliveries.length,
    items: flatItems,
  };
}

/**
 * 7. Get Payments History
 */
export async function getPaymentHistory(customerId: string, businessId: string, limit: number = 30) {
  const payments = await CustomerPayment.find({
    customerId: new Types.ObjectId(customerId),
    businessId: new Types.ObjectId(businessId),
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(limit);

  return payments.map((p: any) => ({
    id: p._id.toString(),
    date: p.paymentDate,
    amount: p.amount,
    paymentMethod: p.paymentMode || 'CASH',
    referenceNumber: p.referenceNumber || '',
    notes: p.notes || '',
  }));
}

/**
 * 8. Get Customer Statement & Outstanding
 */
export async function getCustomerStatement(customerId: string, businessId: string) {
  const custId = new Types.ObjectId(customerId);
  const bizId = new Types.ObjectId(businessId);

  const customer = await Customer.findOne({ _id: custId, businessId: bizId });
  if (!customer) throw new AppError('Customer not found', 404);

  // Total deliveries amount
  const deliveries = await Delivery.find({ customerId: custId, businessId: bizId });
  const totalDeliveriesAmount = deliveries.reduce((sum: number, d: any) => sum + (d.totalAmount || 0), 0);

  // Total payments amount
  const payments = await CustomerPayment.find({ customerId: custId, businessId: bizId });
  const totalPaymentsAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Sub Total, Previous Balance, Total Payable, Received, Outstanding
  const openingBalance = customer.openingBalance || 0;
  const subTotal = totalDeliveriesAmount;
  const totalPayable = openingBalance + subTotal;
  const received = totalPaymentsAmount;
  const balanceOutstanding = Math.max(0, totalPayable - received);

  return {
    openingBalance,
    subTotal,
    totalPayable,
    received,
    balanceOutstanding,
    isDue: balanceOutstanding > 0,
    totalDeliveriesCount: deliveries.length,
    totalPaymentsCount: payments.length,
  };
}

/**
 * 9. Regenerate Customer Portal Token (Admin Action)
 * Invalidates old token and sessions, preserves all delivery and payment history.
 */
export async function regenerateCustomerPortalToken(customerId: string, businessId: string): Promise<string> {
  const custId = new Types.ObjectId(customerId);
  const bizId = new Types.ObjectId(businessId);

  const customer = await Customer.findOne({ _id: custId, businessId: bizId, isDeleted: false });
  if (!customer) throw new AppError('Customer not found', 404);

  const newToken = generateCryptoToken();
  customer.customerPortalToken = newToken;
  customer.portalTokenCreatedAt = new Date();
  customer.portalTokenRevoked = false;
  await customer.save();

  // Invalidate any pending OTPs for old tokens
  await CustomerOtp.updateMany({ customerId: custId }, { $set: { isUsed: true } });

  return newToken;
}

/**
 * 10. Revoke Customer Portal Token (Admin Action)
 */
export async function revokeCustomerPortalToken(customerId: string, businessId: string): Promise<void> {
  const custId = new Types.ObjectId(customerId);
  const bizId = new Types.ObjectId(businessId);

  const customer = await Customer.findOne({ _id: custId, businessId: bizId, isDeleted: false });
  if (!customer) throw new AppError('Customer not found', 404);

  customer.portalTokenRevoked = true;
  await customer.save();

  // Invalidate any pending OTPs
  await CustomerOtp.updateMany({ customerId: custId }, { $set: { isUsed: true } });
}
