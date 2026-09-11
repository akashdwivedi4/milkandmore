import { Response } from 'express';
import { AuthRequest } from '../types';
import { Purchase } from '../models/Purchase';
import { createPurchase, deletePurchase } from '../services/purchaseService';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const purchases = await Purchase.find({
    businessId: new Types.ObjectId(req.user.business_id),
  })
    .populate('supplierId', 'name mobile')
    .populate('items.productId', 'name defaultUnit')
    .sort({ purchaseDate: -1, createdAt: -1 });

  const mapped = purchases.map((p) => {
    const firstItem = p.items[0] || ({} as any);
    return {
      id: p._id.toString(),
      business_id: p.businessId.toString(),
      supplier_id: p.supplierId ? (p.supplierId as any)._id?.toString() || p.supplierId.toString() : '',
      supplier: (p.supplierId as any)?.name || 'Supplier',
      supplier_rel: p.supplierId,
      purchased_at: p.purchaseDate,
      purchase_date: p.purchaseDate,
      product_id: firstItem.productId ? (firstItem.productId as any)._id?.toString() || firstItem.productId.toString() : '',
      product: firstItem.productId,
      quantity: firstItem.quantity || 0,
      unit: firstItem.unit || 'L',
      purchase_cost: firstItem.purchaseRate || 0,
      total_amount: p.totalAmount,
      paid_amount: p.paidAmount,
      balance_amount: p.payableAmount,
      payment_mode: p.paymentMode,
      items: p.items,
      notes: p.notes,
      created_at: p.createdAt.toISOString(),
    };
  });

  res.json({
    success: true,
    data: mapped,
  });
};

export const createPurchaseHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  const purchase = await createPurchase(req.user.business_id, req.user.id, {
    ...req.body,
    idempotencyKey,
  });

  res.status(201).json({
    success: true,
    data: purchase,
    message: 'Purchase created and stock updated successfully.',
  });
};

export const deletePurchaseHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await deletePurchase(req.user.business_id, req.user.id, String(req.params.id));

  res.json({
    success: true,
    message: 'Purchase deleted and inventory reversed successfully.',
  });
};
