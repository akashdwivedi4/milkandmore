import { Response } from 'express';
import { AuthRequest } from '../types';
import { QRCode } from '../models/QRCode';
import { generateEmptyQRCodes, resolveQRCode, assignQRCodeToCustomer } from '../services/qrService';
import { AppError } from '../middleware/errorHandler';

export const generateQRs = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const count = Math.min(100, Math.max(1, Number(req.body.count || 1)));
  const prefix = req.body.prefix || 'MM-QR-';

  const qrs = await generateEmptyQRCodes(req.user.business_id, count, prefix);

  res.status(201).json({
    success: true,
    data: qrs,
    count: qrs.length,
    message: `Generated ${qrs.length} empty QR code(s).`,
  });
};

export const listQRs = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const status = req.query.status as string | undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;

  const filter: any = { businessId: req.user.business_id };
  if (status && status !== 'ALL') {
    filter.status = status.toUpperCase();
  }

  const [qrs, total] = await Promise.all([
    QRCode.find(filter)
      .populate('assignedCustomerId', 'name mobile address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    QRCode.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: qrs,
    total,
    page,
    limit,
  });
};

export const resolveQR = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const qrCodeParam = req.params.qrCode || req.query.code;

  if (!qrCodeParam || typeof qrCodeParam !== 'string') {
    throw new AppError('QR code string is required.', 400);
  }

  const result = await resolveQRCode(req.user.business_id, qrCodeParam);
  res.json({
    success: true,
    data: result,
  });
};

export const assignQR = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { qrCode, customerId } = req.body;

  if (!qrCode || !customerId) {
    throw new AppError('Both qrCode and customerId are required.', 400);
  }

  const result = await assignQRCodeToCustomer(
    req.user.business_id,
    qrCode,
    customerId,
    req.user.id
  );

  res.json({
    success: true,
    message: `QR code ${qrCode} assigned successfully to customer.`,
    data: result,
  });
};
