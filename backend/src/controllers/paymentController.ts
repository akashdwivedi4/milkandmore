import { Response } from 'express';
import { AuthRequest } from '../types';
import { CustomerPayment } from '../models/CustomerPayment';
import { recordCustomerPayment, deleteCustomerPayment } from '../services/paymentService';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { customerId, customer_id, startDate, endDate } = req.query;
  const filter: any = { businessId: new Types.ObjectId(req.user.business_id) };

  const cId = customerId || customer_id;
  if (cId) {
    filter.customerId = new Types.ObjectId(String(cId));
  }

  if (startDate || endDate) {
    filter.paymentDate = {};
    if (startDate) filter.paymentDate.$gte = String(startDate);
    if (endDate) filter.paymentDate.$lte = String(endDate);
  }

  const payments = await CustomerPayment.find(filter)
    .populate('customerId', 'name mobile address')
    .sort({ paymentDate: -1, createdAt: -1 });

  const mapped = payments.map((p) => ({
    id: p._id.toString(),
    business_id: p.businessId.toString(),
    customer_id: p.customerId ? (p.customerId as any)._id?.toString() || p.customerId.toString() : '',
    customer_name: (p.customerId as any)?.name || 'Customer',
    customer: p.customerId,
    amount: p.amount,
    payment_method: p.paymentMode,
    payment_mode: p.paymentMode,
    payment_date: p.paymentDate,
    paid_at: p.paymentDate,
    reference_number: p.referenceNumber,
    notes: p.notes,
    created_at: p.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const createPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const payment = await recordCustomerPayment(req.user.business_id, req.user.id, {
    ...req.body,
    idempotencyKey,
  });

  res.status(201).json({
    success: true,
    data: payment,
    message: 'Payment recorded successfully.',
  });
};

export const deletePaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await deleteCustomerPayment(req.user.business_id, req.user.id, String(req.params.id));

  res.json({
    success: true,
    message: 'Payment deleted and ledger updated successfully.',
  });
};
