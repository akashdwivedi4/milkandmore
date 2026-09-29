import { Types, ClientSession } from 'mongoose';
import { QRCode, IQRCode } from '../models/QRCode';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';
import { AppError } from '../middleware/errorHandler';
import { logAudit } from './auditService';
import { getTodayDateString } from '../utils/date';

export const generateEmptyQRCodes = async (
  businessId: string | Types.ObjectId,
  count: number = 1,
  prefix: string = 'MM-QR-'
): Promise<IQRCode[]> => {
  const bizId = new Types.ObjectId(businessId);
  const created: IQRCode[] = [];

  // Find all existing numeric sequential QR codes for this business and prefix
  const existingNumericQrs = await QRCode.find({
    businessId: bizId,
    qrCode: { $regex: `^${prefix}\\d+$` },
  })
    .select('qrCode')
    .lean();

  let maxIndex = 0;
  for (const item of existingNumericQrs) {
    const rawNum = item.qrCode.slice(prefix.length);
    const num = parseInt(rawNum, 10);
    if (!isNaN(num) && num > maxIndex) {
      maxIndex = num;
    }
  }

  let nextIndex = maxIndex + 1;

  for (let i = 0; i < count; i++) {
    let qrCodeString = '';
    let exists = true;
    while (exists) {
      const codeNum = nextIndex.toString().padStart(6, '0');
      qrCodeString = `${prefix}${codeNum}`;
      nextIndex++;
      const found = await QRCode.findOne({ businessId: bizId, qrCode: qrCodeString });
      if (!found) {
        exists = false;
      }
    }

    const qr = await QRCode.create({
      businessId: bizId,
      qrCode: qrCodeString,
      status: 'UNUSED',
      generatedAt: new Date(),
    });
    created.push(qr);
  }

  await logAudit(bizId, undefined, 'SYSTEM', 'GENERATE_QR', 'QRCode', undefined, {
    count,
    codes: created.map((q) => q.qrCode),
  });

  return created;
};

export const resolveQRCode = async (
  businessId: string | Types.ObjectId,
  qrCodeString: string
): Promise<any> => {
  const bizId = new Types.ObjectId(businessId);
  const cleanCode = qrCodeString.trim();

  // Extract portal token if full URL was scanned
  const portalUrlMatch = cleanCode.match(/\/customer\/portal\/([a-zA-Z0-9_-]+)/);
  const portalToken = portalUrlMatch ? portalUrlMatch[1] : cleanCode;

  // Find in QRCode collection or directly match customer's assignedQr or customerPortalToken
  let qrDoc = await QRCode.findOne({ businessId: bizId, qrCode: cleanCode });

  // If not found in QRCode table, check if a Customer has this as assignedQr or customerPortalToken
  if (!qrDoc) {
    const custDirect = await Customer.findOne({
      businessId: bizId,
      $or: [
        { assignedQr: cleanCode },
        { customerPortalToken: portalToken },
        { customerPortalToken: cleanCode },
      ],
    });
    if (custDirect) {
      qrDoc = await QRCode.findOneAndUpdate(
        { businessId: bizId, qrCode: cleanCode },
        {
          businessId: bizId,
          qrCode: cleanCode,
          status: 'ASSIGNED',
          assignedCustomerId: custDirect._id,
          assignedAt: custDirect.createdAt,
        },
        { upsert: true, new: true }
      );
    }
  }

  if (!qrDoc) {
    throw new AppError(`QR code "${cleanCode}" is not recognized in this business.`, 404);
  }

  if (qrDoc.status === 'DISABLED') {
    return {
      status: 'DISABLED',
      qrCode: qrDoc.qrCode,
      message: 'This QR code is disabled.',
    };
  }

  if (qrDoc.status === 'UNUSED' || !qrDoc.assignedCustomerId) {
    return {
      status: 'UNUSED',
      qrCode: qrDoc.qrCode,
      message: 'This QR is not assigned to any customer.',
      canAssign: true,
    };
  }

  // ASSIGNED QR - Load customer details & today's delivery history
  const customer = await Customer.findOne({
    _id: qrDoc.assignedCustomerId,
    businessId: bizId,
  }).populate('scheduledProducts.productId');

  if (!customer) {
    return {
      status: 'UNUSED',
      qrCode: qrDoc.qrCode,
      message: 'Customer previously assigned was not found. QR can be reassigned.',
      canAssign: true,
    };
  }

  const todayStr = getTodayDateString();
  const todayDeliveries = await Delivery.find({
    businessId: bizId,
    customerId: customer._id,
    deliveryDate: todayStr,
  }).sort({ createdAt: -1 });

  const morningDelivery = todayDeliveries.find((d) => d.shift === 'MORNING');
  const eveningDelivery = todayDeliveries.find((d) => d.shift === 'EVENING');

  return {
    status: 'ASSIGNED',
    qrCode: qrDoc.qrCode,
    customer: {
      id: customer._id.toString(),
      name: customer.name,
      mobile: customer.mobile,
      alternateMobile: customer.alternateMobile,
      address: customer.address,
      locality: customer.locality,
      status: customer.status,
      deliverySchedule: customer.deliverySchedule,
      scheduledProducts: customer.scheduledProducts,
      openingBalance: customer.openingBalance,
      location: customer.location,
    },
    today: {
      date: todayStr,
      morning: {
        delivered: Boolean(morningDelivery),
        delivery: morningDelivery,
      },
      evening: {
        delivered: Boolean(eveningDelivery),
        delivery: eveningDelivery,
      },
      deliveriesCount: todayDeliveries.length,
      deliveries: todayDeliveries,
    },
  };
};

export const assignQRCodeToCustomer = async (
  businessId: string | Types.ObjectId,
  qrCodeString: string,
  customerId: string | Types.ObjectId,
  userId?: string | Types.ObjectId,
  session?: ClientSession | null
): Promise<{ qr: IQRCode; customer: any }> => {
  const bizId = new Types.ObjectId(businessId);
  const custId = new Types.ObjectId(customerId);
  const cleanCode = qrCodeString.trim();

  // Atomically find unused QR and mark assigned
  let qr = await QRCode.findOneAndUpdate(
    {
      businessId: bizId,
      qrCode: cleanCode,
      $or: [{ status: 'UNUSED' }, { status: { $exists: false } }],
    },
    {
      $set: {
        status: 'ASSIGNED',
        assignedCustomerId: custId,
        assignedAt: new Date(),
      },
    },
    { new: true, session }
  );

  // If no unused QR found with that code, check if it already belongs to this customer
  if (!qr) {
    const existingQr = await QRCode.findOne({ businessId: bizId, qrCode: cleanCode });
    if (existingQr) {
      if (existingQr.assignedCustomerId && existingQr.assignedCustomerId.toString() !== custId.toString()) {
        throw new AppError('This QR code is already assigned to another customer.', 409);
      }
      qr = existingQr;
    } else {
      // Create and assign immediately
      const createdDocs = await QRCode.create(
        [
          {
            businessId: bizId,
            qrCode: cleanCode,
            status: 'ASSIGNED',
            assignedCustomerId: custId,
            assignedAt: new Date(),
          },
        ],
        { session }
      );
      qr = createdDocs[0];
    }
  }

  // Update customer assignedQr
  const customer = await Customer.findOneAndUpdate(
    { _id: custId, businessId: bizId },
    {
      $set: {
        assignedQr: qr.qrCode,
        assignedQrId: qr._id,
      },
    },
    { new: true, session }
  );

  if (!customer) {
    throw new AppError('Customer not found for QR assignment.', 404);
  }

  await logAudit(bizId, userId, 'STAFF', 'ASSIGN_QR', 'Customer', custId.toString(), {
    qrCode: qr.qrCode,
  });

  return { qr, customer };
};
