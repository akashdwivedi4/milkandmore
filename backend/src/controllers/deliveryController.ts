import { Response } from 'express';
import { AuthRequest } from '../types';
import { Delivery, IDelivery, DeliveryShift } from '../models/Delivery';
import { Customer } from '../models/Customer';
import {
  recordDelivery,
  updateDelivery,
  deleteDelivery,
} from '../services/deliveryService';
import { getTodayDateString } from '../utils/date';
import { calculateDistanceMeters } from '../utils/units';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const createDeliveryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const delivery = await recordDelivery(req.user.business_id, req.user.id, {
    ...req.body,
    idempotencyKey,
  });

  res.status(201).json({
    success: true,
    data: delivery,
    message: 'Delivery recorded successfully.',
  });
};

export const getDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { customerId, customer_id, date, startDate, endDate, shift, limit = '100' } = req.query;
  const filter: any = { businessId: new Types.ObjectId(req.user.business_id) };

  const custId = customerId || customer_id;
  if (custId) {
    filter.customerId = new Types.ObjectId(String(custId));
  }

  if (date) {
    filter.deliveryDate = String(date);
  } else if (startDate || endDate) {
    filter.deliveryDate = {};
    if (startDate) filter.deliveryDate.$gte = String(startDate);
    if (endDate) filter.deliveryDate.$lte = String(endDate);
  }

  if (shift && shift !== 'ALL') {
    filter.shift = String(shift).toUpperCase();
  }

  const deliveries = await Delivery.find(filter)
    .populate('customerId', 'name mobile address locality')
    .sort({ deliveryDate: -1, createdAt: -1 })
    .limit(Math.min(500, Number(limit)));

  const mapped = deliveries.map((d) => ({
    id: d._id.toString(),
    business_id: d.businessId.toString(),
    customer_id: d.customerId ? (d.customerId as any)._id?.toString() || d.customerId.toString() : '',
    customer_name: (d.customerId as any)?.name || 'Unknown',
    customer: d.customerId,
    delivery_date: d.deliveryDate,
    shift: d.shift,
    status: d.status,
    total_amount: d.totalAmount,
    notes: d.notes,
    items: d.items,
    delivered_at: d.deliveredAt?.toISOString() || d.createdAt.toISOString(),
    is_additional: d.isAdditional,
    isAdditional: d.isAdditional,
  }));

  res.json({
    success: true,
    data: mapped,
    count: mapped.length,
  });
};

export const checkTodayDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const customerId = String(req.params.customerId);

  const todayStr = getTodayDateString();
  const deliveries = await Delivery.find({
    businessId: new Types.ObjectId(req.user.business_id),
    customerId: new Types.ObjectId(customerId),
    deliveryDate: todayStr,
  });

  const morningDelivery = deliveries.find((d) => d.shift === 'MORNING');
  const eveningDelivery = deliveries.find((d) => d.shift === 'EVENING');

  res.json({
    success: true,
    data: {
      hasDeliveryToday: deliveries.length > 0,
      todayDeliveriesCount: deliveries.length,
      morningDelivered: Boolean(morningDelivery),
      eveningDelivered: Boolean(eveningDelivery),
      deliveries,
    },
  });
};

export const updateDeliveryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const delivery = await updateDelivery(
    req.user.business_id,
    req.user.id,
    String(req.params.id),
    req.body
  );

  res.json({
    success: true,
    data: delivery,
    message: 'Delivery updated and inventory reconciled.',
  });
};

export const deleteDeliveryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await deleteDelivery(req.user.business_id, req.user.id, String(req.params.id));

  res.json({
    success: true,
    message: 'Delivery deleted and inventory reconciled successfully.',
  });
};

export const getRouteDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const shift = ((req.query.shift as string) || 'MORNING').toUpperCase() as DeliveryShift;
  const locality = req.query.locality as string | undefined;
  const todayStr = getTodayDateString();

  // Find active customers scheduled for this shift (shift matches or 'BOTH')
  const customerFilter: any = {
    businessId: new Types.ObjectId(req.user.business_id),
    status: 'ACTIVE',
    deliverySchedule: { $in: [shift, 'BOTH'] },
  };

  if (locality) {
    customerFilter.locality = new RegExp(locality, 'i');
  }

  const customers = await Customer.find(customerFilter).populate('scheduledProducts.productId');

  // Find deliveries already made today for this shift
  const todayDeliveries = await Delivery.find({
    businessId: new Types.ObjectId(req.user.business_id),
    deliveryDate: todayStr,
    shift: shift,
    status: 'DELIVERED',
  });

  const deliveredCustIds = new Set(todayDeliveries.map((d) => d.customerId.toString()));

  const routeList = customers.map((c) => {
    const isDelivered = deliveredCustIds.has(c._id.toString());
    const delivery = isDelivered
      ? todayDeliveries.find((d) => d.customerId.toString() === c._id.toString())
      : null;

    return {
      customerId: c._id.toString(),
      name: c.name,
      mobile: c.mobile,
      address: c.address,
      locality: c.locality,
      assignedQr: c.assignedQr,
      location: c.location,
      scheduledProducts: c.scheduledProducts,
      status: isDelivered ? 'DELIVERED' : 'PENDING',
      delivery,
    };
  });

  res.json({
    success: true,
    data: {
      shift,
      date: todayStr,
      totalScheduled: routeList.length,
      deliveredCount: routeList.filter((r) => r.status === 'DELIVERED').length,
      pendingCount: routeList.filter((r) => r.status === 'PENDING').length,
      customers: routeList,
    },
  });
};

export const getNearbyCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const lat = Number(req.query.lat || req.query.latitude);
  const lng = Number(req.query.lng || req.query.longitude);
  const shift = (((req.query.shift as string) || 'MORNING').toUpperCase()) as DeliveryShift;
  const radiusMeters = Number(req.query.radius || 100);
  const todayStr = getTodayDateString();

  if (isNaN(lat) || isNaN(lng)) {
    throw new AppError('Valid lat and lng query parameters are required.', 400);
  }

  // Find active scheduled customers
  const customers = await Customer.find({
    businessId: new Types.ObjectId(req.user.business_id),
    status: 'ACTIVE',
    deliverySchedule: { $in: [shift as any, 'BOTH'] },
    'location.coordinates': { $exists: true, $ne: [] },
  }).populate('scheduledProducts.productId');

  // Find deliveries made today
  const todayDeliveries = await Delivery.find({
    businessId: new Types.ObjectId(req.user.business_id),
    deliveryDate: todayStr,
    shift: shift,
    status: 'DELIVERED',
  });
  const deliveredMap = new Map(todayDeliveries.map((d) => [d.customerId.toString(), d]));

  const nearbyList = [];

  for (const cust of customers) {
    if (cust.location?.coordinates && cust.location.coordinates.length === 2) {
      const custLng = cust.location.coordinates[0];
      const custLat = cust.location.coordinates[1];
      const dist = calculateDistanceMeters(lat, lng, custLat, custLng);

      if (dist <= radiusMeters) {
        const isDelivered = deliveredMap.has(cust._id.toString());
        nearbyList.push({
          customerId: cust._id.toString(),
          name: cust.name,
          mobile: cust.mobile,
          address: cust.address,
          assignedQr: cust.assignedQr,
          distanceMeters: dist,
          isDelivered,
          status: isDelivered ? 'DELIVERED' : 'PENDING',
          delivery: deliveredMap.get(cust._id.toString()) || null,
        });
      }
    }
  }

  nearbyList.sort((a, b) => a.distanceMeters - b.distanceMeters);

  res.json({
    success: true,
    data: nearbyList,
    count: nearbyList.length,
    pendingNearbyCount: nearbyList.filter((n) => !n.isDelivered).length,
  });
};
