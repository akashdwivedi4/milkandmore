import { Response } from 'express';
import { AuthRequest } from '../types';
import * as purchaseReturnService from '../services/purchaseReturnService';
import { AppError } from '../middleware/errorHandler';

export const createPurchaseReturnHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const purchaseReturn = await purchaseReturnService.createPurchaseReturn(
    req.user.business_id,
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    data: purchaseReturn,
  });
};

export const getPurchaseReturnsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { supplierId, startDate, endDate } = req.query;

  const returns = await purchaseReturnService.getPurchaseReturns(req.user.business_id, {
    supplierId: supplierId as string,
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.json({
    success: true,
    data: returns,
  });
};
