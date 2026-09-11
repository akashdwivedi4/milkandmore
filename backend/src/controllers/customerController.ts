import { Response } from 'express';
import { AuthRequest } from '../types';
import { Customer } from '../models/Customer';
import { QRCode } from '../models/QRCode';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { assignQRCodeToCustomer, resolveQRCode } from '../services/qrService';
import { logAudit } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';
import { getTodayDateString } from '../utils/date';
import { Types } from 'mongoose';
import { postJournalEntry, CHART_OF_ACCOUNTS } from '../services/accountingService';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { search, status, shift, locality, page = '1', limit = '100', sortBy = 'name', sortOrder = 'asc' } =
    req.query;

  const filter: any = {
    businessId: new Types.ObjectId(req.user.business_id),
    isDeleted: { $ne: true },
  };

  if (status && status !== 'ALL') {
    filter.status = status;
  } else if (!status && req.query.active !== undefined) {
    filter.status = req.query.active === 'true' ? 'ACTIVE' : 'INACTIVE';
  }

  if (shift && shift !== 'ALL') {
    filter.deliverySchedule = { $in: [shift, 'BOTH'] };
  }

  if (locality) {
    filter.locality = new RegExp(String(locality), 'i');
  }

  if (search) {
    const searchRegex = new RegExp(String(search).trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { mobile: searchRegex },
      { alternateMobile: searchRegex },
      { assignedQr: searchRegex },
      { address: searchRegex },
      { locality: searchRegex },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(500, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder === 'desc' ? -1 : 1;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate('scheduledProducts.productId')
      .sort({ [String(sortBy)]: sortDirection })
      .skip(skip)
      .limit(limitNum),
    Customer.countDocuments(filter),
  ]);

  // Map to frontend-friendly structure
  const mapped = customers.map((c) => ({
    id: c._id.toString(),
    business_id: c.businessId.toString(),
    name: c.name,
    mobile: c.mobile,
    alternateMobile: c.alternateMobile,
    address: c.address,
    locality: c.locality,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    active: c.status === 'ACTIVE',
    status: c.status,
    inactiveReason: c.inactiveReason,
    notes: c.notes,
    customer_since: c.customerSince?.toISOString().split('T')[0],
    service_end_date: c.serviceEndDate?.toISOString().split('T')[0] || null,
    opening_balance: c.openingBalance,
    qr_token: c.assignedQr || '',
    assigned_qr: c.assignedQr || '',
    delivery_schedule: c.deliverySchedule,
    scheduled_products: c.scheduledProducts,
    location: c.location,
    locationAccuracy: c.locationAccuracy,
    created_at: c.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
    total,
    page: pageNum,
    limit: limitNum,
  });
};

export const getCustomerById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  }).populate('scheduledProducts.productId');

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const todayStr = getTodayDateString();
  const todayDeliveries = await Delivery.find({
    businessId: req.user.business_id,
    customerId: customer._id,
    deliveryDate: todayStr,
  });

  const morning = todayDeliveries.find((d) => d.shift === 'MORNING');
  const evening = todayDeliveries.find((d) => d.shift === 'EVENING');

  res.json({
    success: true,
    data: {
      id: customer._id.toString(),
      business_id: customer.businessId.toString(),
      name: customer.name,
      mobile: customer.mobile,
      alternateMobile: customer.alternateMobile,
      address: customer.address,
      locality: customer.locality,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      active: customer.status === 'ACTIVE',
      status: customer.status,
      inactiveReason: customer.inactiveReason,
      notes: customer.notes,
      customer_since: customer.customerSince?.toISOString().split('T')[0],
      service_end_date: customer.serviceEndDate?.toISOString().split('T')[0] || null,
      opening_balance: customer.openingBalance,
      qr_token: customer.assignedQr || '',
      assigned_qr: customer.assignedQr || '',
      delivery_schedule: customer.deliverySchedule,
      scheduled_products: customer.scheduledProducts,
      location: customer.location,
      locationAccuracy: customer.locationAccuracy,
      today: {
        date: todayStr,
        morning: { delivered: Boolean(morning), delivery: morning },
        evening: { delivered: Boolean(evening), delivery: evening },
        deliveriesCount: todayDeliveries.length,
      },
    },
  });
};

export const getCustomerByQr = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const token = decodeURIComponent(String(req.params.token || ''));

  const result = await resolveQRCode(req.user.business_id, token);
  if (result.status === 'ASSIGNED') {
    res.json({
      success: true,
      data: result.customer,
      today: result.today,
    });
    return;
  }

  res.json({
    success: true,
    data: result,
  });
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const {
    name,
    mobile,
    alternateMobile,
    address,
    locality,
    city,
    state,
    pincode,
    customer_since,
    customerSince,
    service_end_date,
    serviceEndDate,
    notes,
    opening_balance,
    openingBalance,
    delivery_schedule,
    deliverySchedule,
    scheduled_products,
    scheduledProducts,
    assigned_qr,
    assignedQr,
    qr_token,
    latitude,
    longitude,
    locationAccuracy,
  } = req.body;

  if (!name || !mobile) {
    throw new AppError('Customer name and mobile number are required.', 400);
  }

  const requestedQr = assigned_qr || assignedQr || qr_token;

  let geoLoc: any = undefined;
  if (latitude !== undefined && longitude !== undefined) {
    geoLoc = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };
  }

  const customer = await Customer.create({
    businessId: new Types.ObjectId(req.user.business_id),
    name: name.trim(),
    mobile: mobile.trim(),
    alternateMobile: alternateMobile?.trim(),
    address: address?.trim() || '',
    locality: locality?.trim() || '',
    city: city?.trim() || '',
    state: state?.trim() || '',
    pincode: pincode?.trim() || '',
    customerSince: customer_since || customerSince ? new Date(customer_since || customerSince) : new Date(),
    serviceEndDate: service_end_date || serviceEndDate ? new Date(service_end_date || serviceEndDate) : undefined,
    status: 'ACTIVE',
    notes: notes?.trim() || '',
    openingBalance: Number(opening_balance ?? openingBalance ?? 0),
    deliverySchedule: delivery_schedule || deliverySchedule || 'MORNING',
    scheduledProducts: scheduled_products || scheduledProducts || [],
    location: geoLoc,
    locationAccuracy: locationAccuracy ? Number(locationAccuracy) : undefined,
    locationUpdatedAt: geoLoc ? new Date() : undefined,
  });

  // If a QR code is assigned, atomically link it
  if (requestedQr && requestedQr.trim()) {
    try {
      await assignQRCodeToCustomer(
        req.user.business_id,
        requestedQr.trim(),
        customer._id,
        req.user.id
      );
      customer.assignedQr = requestedQr.trim();
    } catch (qrErr: any) {
      // If assignment fails, still log and throw
      await Customer.deleteOne({ _id: customer._id });
      throw qrErr;
    }
  } else {
    // Generate an automatic QR code identifier if none provided
    const autoQr = `MM-AUTO-${customer._id.toString().slice(-6).toUpperCase()}`;
    await QRCode.create({
      businessId: req.user.business_id,
      qrCode: autoQr,
      status: 'ASSIGNED',
      assignedCustomerId: customer._id,
      assignedAt: new Date(),
    });
    customer.assignedQr = autoQr;
    await customer.save();
  }

  // Post opening balance double-entry journal if openingBalance is non-zero
  const opBal = Number(customer.openingBalance || 0);
  if (opBal > 0) {
    await postJournalEntry({
      businessId: req.user.business_id,
      entryDate: getTodayDateString(),
      entryType: 'OPENING_BALANCE',
      referenceType: 'CUSTOMER_OPENING',
      referenceId: customer._id.toString(),
      narration: `Opening balance for customer ${customer.name}`,
      lines: [
        {
          accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
          accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
          accountType: 'ASSET',
          debit: opBal,
          credit: 0,
          partyType: 'CUSTOMER',
          partyId: customer._id,
          partyName: customer.name,
        },
        {
          accountCode: CHART_OF_ACCOUNTS.OPENING_EQUITY.code,
          accountName: CHART_OF_ACCOUNTS.OPENING_EQUITY.name,
          accountType: 'EQUITY',
          debit: 0,
          credit: opBal,
        },
      ],
    });
  } else if (opBal < 0) {
    const absBal = Math.abs(opBal);
    await postJournalEntry({
      businessId: req.user.business_id,
      entryDate: getTodayDateString(),
      entryType: 'OPENING_BALANCE',
      referenceType: 'CUSTOMER_OPENING',
      referenceId: customer._id.toString(),
      narration: `Opening advance for customer ${customer.name}`,
      lines: [
        {
          accountCode: CHART_OF_ACCOUNTS.OPENING_EQUITY.code,
          accountName: CHART_OF_ACCOUNTS.OPENING_EQUITY.name,
          accountType: 'EQUITY',
          debit: absBal,
          credit: 0,
        },
        {
          accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
          accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
          accountType: 'ASSET',
          debit: 0,
          credit: absBal,
          partyType: 'CUSTOMER',
          partyId: customer._id,
          partyName: customer.name,
        },
      ],
    });
  }

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'CREATE_CUSTOMER',
    'Customer',
    customer._id.toString(),
    { name: customer.name, mobile: customer.mobile }
  );

  res.status(201).json({
    success: true,
    data: {
      id: customer._id.toString(),
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address,
      qr_token: customer.assignedQr,
      assigned_qr: customer.assignedQr,
      status: customer.status,
      active: true,
    },
  });
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const {
    name,
    mobile,
    alternateMobile,
    address,
    locality,
    city,
    state,
    pincode,
    service_end_date,
    serviceEndDate,
    ending_reason,
    inactiveReason,
    notes,
    opening_balance,
    openingBalance,
    delivery_schedule,
    deliverySchedule,
    scheduled_products,
    scheduledProducts,
    latitude,
    longitude,
    locationAccuracy,
    assigned_qr,
    assignedQr,
  } = req.body;

  if (name !== undefined) customer.name = name.trim();
  if (mobile !== undefined) customer.mobile = mobile.trim();
  if (alternateMobile !== undefined) customer.alternateMobile = alternateMobile.trim();
  if (address !== undefined) customer.address = address.trim();
  if (locality !== undefined) customer.locality = locality.trim();
  if (city !== undefined) customer.city = city.trim();
  if (state !== undefined) customer.state = state.trim();
  if (pincode !== undefined) customer.pincode = pincode.trim();
  if (service_end_date !== undefined || serviceEndDate !== undefined) {
    customer.serviceEndDate = (service_end_date || serviceEndDate) ? new Date(service_end_date || serviceEndDate) : undefined;
  }
  if (ending_reason !== undefined || inactiveReason !== undefined) {
    customer.inactiveReason = ending_reason || inactiveReason;
  }
  if (notes !== undefined) customer.notes = notes.trim();
  if (opening_balance !== undefined || openingBalance !== undefined) {
    customer.openingBalance = Number(opening_balance ?? openingBalance);
  }
  if (delivery_schedule !== undefined || deliverySchedule !== undefined) {
    customer.deliverySchedule = delivery_schedule || deliverySchedule;
  }
  if (scheduled_products !== undefined || scheduledProducts !== undefined) {
    customer.scheduledProducts = scheduled_products || scheduledProducts;
  }

  if (latitude !== undefined && longitude !== undefined) {
    customer.location = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };
    customer.locationAccuracy = locationAccuracy ? Number(locationAccuracy) : undefined;
    customer.locationUpdatedAt = new Date();
  }

  // Handle QR re-assignment if changed
  const newQr = assigned_qr || assignedQr;
  if (newQr && newQr !== customer.assignedQr) {
    await assignQRCodeToCustomer(req.user.business_id, newQr, customer._id, req.user.id);
    customer.assignedQr = newQr;
  }

  await customer.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'UPDATE_CUSTOMER',
    'Customer',
    customer._id.toString()
  );

  res.json({
    success: true,
    data: customer,
  });
};

export const deactivateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { reason } = req.body;

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!customer) throw new AppError('Customer not found.', 404);

  customer.status = 'INACTIVE';
  customer.inactiveReason = reason || 'Deactivated by admin';
  customer.serviceEndDate = new Date();
  await customer.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'DEACTIVATE_CUSTOMER',
    'Customer',
    customer._id.toString(),
    { reason }
  );

  res.json({
    success: true,
    message: 'Customer deactivated successfully.',
    data: customer,
  });
};

export const reactivateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!customer) throw new AppError('Customer not found.', 404);

  customer.status = 'ACTIVE';
  customer.inactiveReason = undefined;
  customer.serviceEndDate = undefined;
  await customer.save();

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'REACTIVATE_CUSTOMER',
    'Customer',
    customer._id.toString()
  );

  res.json({
    success: true,
    message: 'Customer reactivated successfully.',
    data: customer,
  });
};

export const updateCustomerLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { latitude, longitude, accuracy, source = 'GPS' } = req.body;

  if (latitude === undefined || longitude === undefined) {
    throw new AppError('Latitude and longitude are required.', 400);
  }

  const customer = await Customer.findOne({
    _id: req.params.id,
    businessId: req.user.business_id,
  });

  if (!customer) throw new AppError('Customer not found.', 404);

  customer.location = {
    type: 'Point',
    coordinates: [Number(longitude), Number(latitude)],
  };
  customer.locationAccuracy = accuracy ? Number(accuracy) : undefined;
  customer.locationSource = source;
  customer.locationUpdatedAt = new Date();
  await customer.save();

  res.json({
    success: true,
    message: 'GPS location updated successfully.',
    data: customer.location,
  });
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const customerId = req.params.id;
  const bizId = new Types.ObjectId(req.user.business_id);

  const customer = await Customer.findOne({
    _id: customerId,
    businessId: bizId,
  });

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  // Release any linked QR code back to UNUSED
  if (customer.assignedQr || customer.assignedQrId) {
    await QRCode.updateMany(
      { businessId: bizId, assignedCustomerId: customer._id },
      {
        $set: { status: 'UNUSED' },
        $unset: { assignedCustomerId: 1, assignedAt: 1 },
      }
    );
    customer.assignedQr = undefined;
    customer.assignedQrId = undefined;
  }

  // Check for historical transaction records
  const [deliveryCount, paymentCount] = await Promise.all([
    Delivery.countDocuments({ customerId: customer._id, businessId: bizId }),
    CustomerPayment.countDocuments({ customerId: customer._id, businessId: bizId }),
  ]);

  const hasHistory = deliveryCount > 0 || paymentCount > 0 || Math.abs(customer.openingBalance || 0) > 0.01;

  if (hasHistory) {
    // Safe soft-delete: preserve customer snapshot data for historical records & bills
    customer.isDeleted = true;
    customer.status = 'INACTIVE';
    customer.deletedAt = new Date();
    await customer.save();
  } else {
    // Clean delete: no transactions exist
    await Customer.deleteOne({ _id: customer._id, businessId: bizId });
  }

  await logAudit(
    req.user.business_id,
    req.user.id,
    req.user.role,
    'DELETE_CUSTOMER',
    'Customer',
    customer._id.toString(),
    { name: customer.name, mobile: customer.mobile, softDeleted: hasHistory }
  );

  res.json({
    success: true,
    message: `Customer "${customer.name}" deleted successfully.`,
  });
};
