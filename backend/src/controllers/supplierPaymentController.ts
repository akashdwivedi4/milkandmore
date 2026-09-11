import { Response } from 'express';
import { AuthRequest } from '../types';
import { SupplierPayment } from '../models/SupplierPayment';
import { recordSupplierPayment, deleteSupplierPayment } from '../services/paymentService';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getSupplierPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { supplier_id, supplierId, start_date, startDate, end_date, endDate } = req.query;
  const filter: any = { businessId: new Types.ObjectId(req.user.business_id) };

  const sId = supplier_id || supplierId;
  if (sId) {
    filter.supplierId = new Types.ObjectId(String(sId));
  }

  const sDate = start_date || startDate;
  const eDate = end_date || endDate;
  if (sDate || eDate) {
    filter.paymentDate = {};
    if (sDate) filter.paymentDate.$gte = String(sDate);
    if (eDate) filter.paymentDate.$lte = String(eDate);
  }

  const payments = await SupplierPayment.find(filter)
    .populate('supplierId', 'name mobile')
    .sort({ paymentDate: -1, createdAt: -1 });

  const mapped = payments.map((p) => ({
    id: p._id.toString(),
    business_id: p.businessId.toString(),
    supplier_id: p.supplierId ? (p.supplierId as any)._id?.toString() || p.supplierId.toString() : '',
    supplier_name: (p.supplierId as any)?.name || 'Supplier',
    supplier: p.supplierId,
    amount: p.amount,
    payment_date: p.paymentDate,
    payment_method: p.paymentMode,
    payment_mode: p.paymentMode,
    reference_number: p.referenceNumber,
    notes: p.notes,
    created_at: p.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const createSupplierPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const payment = await recordSupplierPayment(req.user.business_id, req.user.id, {
    ...req.body,
    idempotencyKey,
  });

  res.status(201).json({
    success: true,
    data: payment,
    message: 'Supplier payment recorded successfully.',
  });
};

export const deleteSupplierPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await deleteSupplierPayment(req.user.business_id, req.user.id, String(req.params.id));

  res.json({
    success: true,
    message: 'Supplier payment deleted and balances reconciled.',
  });
};
