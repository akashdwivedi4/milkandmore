import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Business } from '../src/models/Business';
import { User } from '../src/models/User';
import { Customer } from '../src/models/Customer';
import { CustomerOtp } from '../src/models/CustomerOtp';
import { Delivery } from '../src/models/Delivery';
import { CustomerPayment } from '../src/models/CustomerPayment';
import { signToken } from '../src/utils/jwt';
import { ensureCustomerPortalToken } from '../src/services/customerPortalService';
import { getTodayDateString } from '../src/utils/date';

describe('Secure Customer QR Portal with OTP Verification Suite', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  let businessId: string;
  let adminToken: string;

  let customerA: any;
  let customerB: any;

  let portalTokenA: string;
  let portalTokenB: string;

  let sessionTokenA: string;
  let sessionTokenB: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    app = createApp();

    // 1. Create Business
    const biz = await Business.create({
      name: 'Shree Krishna Dairy',
      ownerName: 'Krishna Murari',
      mobile: '9829012345',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      setupCompleted: true,
      openingCash: 10000,
      openingBank: 20000,
      openingUpi: 5000,
    });
    businessId = biz._id.toString();

    // 2. Create Admin User
    const adminUser = await User.create({
      businessId: biz._id,
      name: 'Admin User',
      email: 'admin@shreekrishna.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = signToken({
      userId: adminUser._id.toString(),
      businessId: businessId,
      role: 'ADMIN',
    });

    // 3. Create Customer A
    customerA = await Customer.create({
      businessId: biz._id,
      name: 'Rahul Sharma',
      mobile: '9876543247',
      address: 'Plot 42, Vaishali Nagar, Jaipur',
      locality: 'Vaishali Nagar',
      status: 'ACTIVE',
      deliverySchedule: 'MORNING',
      openingBalance: 500,
    });
    portalTokenA = await ensureCustomerPortalToken(customerA);

    // 4. Create Customer B
    customerB = await Customer.create({
      businessId: biz._id,
      name: 'Pooja Verma',
      mobile: '9123456789',
      address: 'Flat 101, Mansarovar, Jaipur',
      locality: 'Mansarovar',
      status: 'ACTIVE',
      deliverySchedule: 'EVENING',
      openingBalance: 1200,
    });
    portalTokenB = await ensureCustomerPortalToken(customerB);

    // 5. Create Deliveries for Customer A and B
    const testProductId = new Types.ObjectId();
    const todayStr = getTodayDateString();
    await Delivery.create({
      businessId: biz._id,
      customerId: customerA._id,
      deliveryDate: todayStr,
      shift: 'MORNING',
      items: [
        {
          productId: testProductId,
          productName: 'Cow Milk',
          quantity: 2,
          unit: 'L',
          normalizedQty: 2,
          rate: 60,
          amount: 120,
        },
      ],
      totalAmount: 120,
      status: 'DELIVERED',
      isAdditional: false,
    });

    await Delivery.create({
      businessId: biz._id,
      customerId: customerB._id,
      deliveryDate: todayStr,
      shift: 'EVENING',
      items: [
        {
          productId: testProductId,
          productName: 'Buffalo Milk',
          quantity: 1,
          unit: 'L',
          normalizedQty: 1,
          rate: 75,
          amount: 75,
        },
      ],
      totalAmount: 75,
      status: 'DELIVERED',
      isAdditional: false,
    });

    // 6. Create Payments for Customer A and B
    await CustomerPayment.create({
      businessId: biz._id,
      customerId: customerA._id,
      paymentDate: todayStr,
      amount: 500,
      paymentMode: 'UPI',
      referenceNumber: 'UPI-A-12345',
    });

    await CustomerPayment.create({
      businessId: biz._id,
      customerId: customerB._id,
      paymentDate: todayStr,
      amount: 1000,
      paymentMode: 'CASH',
      referenceNumber: 'CASH-B-67890',
    });
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Privacy & Security Before Verification', () => {
    it('unauthenticated QR scan returns ONLY masked phone and business name — ZERO PII exposed', async () => {
      const res = await request(app)
        .get(`/api/customer-portal/verify-info/${portalTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.businessName).toBe('Shree Krishna Dairy');
      // Must contain only masked phone indicator ending in 47
      expect(res.body.data.maskedMobile).toContain('ending in 47');

      // STRICT PII CHECK: Ensure personal info is NEVER returned before verification!
      expect(res.body.data.name).toBeUndefined();
      expect(res.body.data.customerName).toBeUndefined();
      expect(res.body.data.address).toBeUndefined();
      expect(res.body.data.customerId).toBeUndefined();
      expect(res.body.data.id).toBeUndefined();
      expect(res.body.data.balance).toBeUndefined();
      expect(res.body.data.deliveries).toBeUndefined();
      expect(res.body.data.payments).toBeUndefined();
      expect(res.body.data.bills).toBeUndefined();
      // Ensure full 10-digit mobile number is not present anywhere in data
      expect(JSON.stringify(res.body.data)).not.toContain('9876543247');
      expect(JSON.stringify(res.body.data)).not.toContain('Rahul');
    });

    it('returns privacy-safe generic error for non-existent or invalid QR tokens', async () => {
      const res = await request(app)
        .get('/api/customer-portal/verify-info/non-existent-random-token-999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("We couldn't verify this QR code.");
      // Ensure it does not mention whether a customer exists
      expect(res.body.error).not.toContain('customer');
      expect(res.body.error).not.toContain('Rahul');
    });
  });

  describe('2. OTP Generation, Delivery & Security', () => {
    it('requests OTP successfully without exposing OTP in response body or headers', async () => {
      const res = await request(app)
        .post('/api/customer-portal/request-otp')
        .send({ token: portalTokenA })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('ending in 47');
      expect(res.body.cooldownSeconds).toBe(60);

      // CRITICAL: Ensure OTP is NEVER exposed in the HTTP response!
      expect(res.body.otp).toBeUndefined();
      expect(res.body.data?.otp).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
    });

    it('stores OTP in database as SHA-256 hash — NEVER in plaintext', async () => {
      const record = await CustomerOtp.findOne({ portalToken: portalTokenA, isUsed: false });
      expect(record).not.toBeNull();
      // SHA-256 hash is 64 hex characters
      expect(record!.otpHash).toHaveLength(64);
      expect(record!.otpHash).toMatch(/^[0-9a-f]{64}$/);

      // Verify that the plaintext OTP is NOT equal to otpHash
      const testOtp = (global as any).__LAST_TEST_OTP__;
      expect(testOtp).toBeDefined();
      expect(record!.otpHash).not.toBe(testOtp);
    });

    it('enforces 60-second cooldown on OTP resend requests (Rate Limiting)', async () => {
      const res = await request(app)
        .post('/api/customer-portal/request-otp')
        .send({ token: portalTokenA })
        .expect(429);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Please wait');
      expect(res.body.error).toContain('second(s) before requesting another OTP');
    });
  });

  describe('3. OTP Verification & Session Security', () => {
    it('rejects incorrect OTP and decrements remaining attempts', async () => {
      const res = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: '000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid OTP');
      expect(res.body.error).toContain('attempt(s) remaining');
    });

    it('locks OTP after maximum incorrect attempts are exceeded', async () => {
      // Attempt 2
      await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: '111111' })
        .expect(400);

      // Attempt 3 (reaches max 3 attempts)
      const res3 = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: '222222' })
        .expect(429);

      expect(res3.body.success).toBe(false);
      expect(res3.body.error).toContain('Maximum incorrect OTP attempts exceeded');

      // Subsequent attempt is blocked
      const res4 = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: '333333' })
        .expect(429);
      expect(res4.body.error).toContain('Maximum incorrect OTP attempts exceeded');
    });

    it('successfully verifies correct OTP, returns session token, and sets HTTP-only cookie', async () => {
      // Fast-forward cooldown by clearing recent OTPs
      await CustomerOtp.deleteMany({ portalToken: portalTokenA });

      // Request fresh OTP
      await request(app)
        .post('/api/customer-portal/request-otp')
        .send({ token: portalTokenA })
        .expect(200);

      const validOtp = (global as any).__LAST_TEST_OTP__;
      expect(validOtp).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: validOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.sessionToken).toBeDefined();
      sessionTokenA = verifyRes.body.sessionToken;

      // Verify HTTP-only cookie header
      const cookies = verifyRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('mm_customer_session=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
    });

    it('enforces single-use OTP (replaying the same OTP fails)', async () => {
      const validOtp = (global as any).__LAST_TEST_OTP__;
      const res = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenA, otp: validOtp })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('This OTP has already been used');
    });

    it('verifies Customer B to obtain sessionTokenB for IDOR testing', async () => {
      await request(app)
        .post('/api/customer-portal/request-otp')
        .send({ token: portalTokenB })
        .expect(200);

      const otpB = (global as any).__LAST_TEST_OTP__;
      const verifyRes = await request(app)
        .post('/api/customer-portal/verify-otp')
        .send({ token: portalTokenB, otp: otpB })
        .expect(200);

      sessionTokenB = verifyRes.body.sessionToken;
      expect(sessionTokenB).toBeDefined();
    });
  });

  describe('4. Strict Customer Data Isolation & IDOR Protection', () => {
    it('Customer A session returns Customer A profile only', async () => {
      const res = await request(app)
        .get('/api/customer-portal/me')
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Rahul Sharma');
      expect(res.body.data.address).toContain('Vaishali Nagar');
      expect(res.body.data.maskedMobile).toContain('ending in 47');
      expect(res.body.data.formattedCustomerId).toBeDefined();
    });

    it('Customer A cannot access Customer B data by modifying query params or body (IDOR Prevention)', async () => {
      // Attacker tries passing Customer B's ID in query parameter
      const resQuery = await request(app)
        .get(`/api/customer-portal/me?customerId=${customerB._id.toString()}`)
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);

      // MUST still return Customer A data! Customer B ID is completely ignored.
      expect(resQuery.body.data.name).toBe('Rahul Sharma');
      expect(resQuery.body.data.id).toBe(customerA._id.toString());
      expect(resQuery.body.data.name).not.toBe('Pooja Verma');

      // Attacker tries requesting Customer B deliveries
      const resDeliveries = await request(app)
        .get(`/api/customer-portal/deliveries?customerId=${customerB._id.toString()}`)
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);

      // Customer A has Cow Milk, Customer B has Buffalo Milk
      const items = resDeliveries.body.data.items;
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.item).not.toBe('Buffalo Milk');
      }
    });

    it('Customer A can view their own deliveries, today status, payments, and statement', async () => {
      // Today delivery
      const todayRes = await request(app)
        .get('/api/customer-portal/today')
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);
      expect(todayRes.body.data.delivered).toBe(true);
      expect(todayRes.body.data.summaryText).toContain('Cow Milk — 2 L — Morning');

      // Delivery history
      const delivRes = await request(app)
        .get('/api/customer-portal/deliveries')
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);
      expect(delivRes.body.data.totalDeliveries).toBe(1);
      expect(delivRes.body.data.items[0].item).toBe('Cow Milk');
      expect(delivRes.body.data.items[0].quantity).toBe(2);

      // Payments
      const payRes = await request(app)
        .get('/api/customer-portal/payments')
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);
      expect(payRes.body.data.length).toBe(1);
      expect(payRes.body.data[0].amount).toBe(500);
      expect(payRes.body.data[0].paymentMethod).toBe('UPI');

      // Statement
      const stmtRes = await request(app)
        .get('/api/customer-portal/statement')
        .set('Authorization', `Bearer ${sessionTokenA}`)
        .expect(200);
      expect(stmtRes.body.data.openingBalance).toBe(500);
      expect(stmtRes.body.data.subTotal).toBe(120);
      expect(stmtRes.body.data.totalPayable).toBe(620);
      expect(stmtRes.body.data.received).toBe(500);
      expect(stmtRes.body.data.balanceOutstanding).toBe(120);
      expect(stmtRes.body.data.isDue).toBe(true);
    });

    it('unauthenticated requests without session token return 401 Unauthorized', async () => {
      await request(app).get('/api/customer-portal/me').expect(401);
      await request(app).get('/api/customer-portal/today').expect(401);
      await request(app).get('/api/customer-portal/deliveries').expect(401);
      await request(app).get('/api/customer-portal/payments').expect(401);
      await request(app).get('/api/customer-portal/statement').expect(401);
    });
  });

  describe('5. QR Lifecycle Management (Regenerate & Revoke)', () => {
    it('regenerates customer QR code: creates new token, immediately invalidates old QR access', async () => {
      const oldToken = portalTokenA;
      const oldSession = sessionTokenA;

      // Admin calls regenerate-qr
      const regenRes = await request(app)
        .post(`/api/customers/${customerA._id.toString()}/regenerate-qr`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(regenRes.body.success).toBe(true);
      const newToken = regenRes.body.data.customerPortalToken;
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(oldToken);

      // Old QR token is immediately rejected on verify-info
      const oldVerifyRes = await request(app)
        .get(`/api/customer-portal/verify-info/${oldToken}`)
        .expect(404);
      expect(oldVerifyRes.body.error).toBe("We couldn't verify this QR code.");

      // Active session created with old token is IMMEDIATELY REVOKED
      const oldSessionRes = await request(app)
        .get('/api/customer-portal/me')
        .set('Authorization', `Bearer ${oldSession}`)
        .expect(401);
      expect(oldSessionRes.body.error).toContain('revoked or updated');

      // Customer history, deliveries, and payments remain 100% INTACT!
      const deliveriesCount = await Delivery.countDocuments({ customerId: customerA._id });
      const paymentsCount = await CustomerPayment.countDocuments({ customerId: customerA._id });
      expect(deliveriesCount).toBe(1);
      expect(paymentsCount).toBe(1);

      // New QR token works cleanly
      const newVerifyRes = await request(app)
        .get(`/api/customer-portal/verify-info/${newToken}`)
        .expect(200);
      expect(newVerifyRes.body.data.valid).toBe(true);
    });

    it('revokes customer QR code: immediately stops customer portal access', async () => {
      // Admin calls revoke-qr on Customer B
      await request(app)
        .post(`/api/customers/${customerB._id.toString()}/revoke-qr`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify-info returns 404
      await request(app)
        .get(`/api/customer-portal/verify-info/${portalTokenB}`)
        .expect(404);

      // Active session for Customer B returns 401
      const sessionRes = await request(app)
        .get('/api/customer-portal/me')
        .set('Authorization', `Bearer ${sessionTokenB}`)
        .expect(401);
      expect(sessionRes.body.error).toContain('revoked or updated');
    });
  });

  describe('6. Milkman Scanner Backward Compatibility', () => {
    it('milkman scanner resolves customer portal QR URL and token seamlessly', async () => {
      // Create Customer C with an active portal token
      const customerC = await Customer.create({
        businessId: new Types.ObjectId(businessId),
        name: 'Sunil Kumar',
        mobile: '9781234567',
        address: 'Sector 3, Pratap Nagar, Jaipur',
        status: 'ACTIVE',
        deliverySchedule: 'MORNING',
        openingBalance: 0,
      });
      const tokenC = await ensureCustomerPortalToken(customerC);

      // Milkman scanner scans the customer portal URL:
      // e.g. "https://milkandmore.app/customer/portal/<tokenC>"
      const scannedUrl = `https://milkandmore.app/customer/portal/${tokenC}`;

      // Staff resolver route
      const resolveRes = await request(app)
        .get(`/api/qr/${encodeURIComponent(scannedUrl)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resolveRes.body.success).toBe(true);
      expect(resolveRes.body.data.status).toBe('ASSIGNED');
      expect(resolveRes.body.data.customer.name).toBe('Sunil Kumar');
      expect(resolveRes.body.data.customer.mobile).toBe('9781234567');
    });
  });
});
