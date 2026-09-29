import { Request, Response } from 'express';
import { CustomerPortalRequest } from '../middleware/customerAuth';
import * as portalService from '../services/customerPortalService';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

export const getVerifyInfo = async (req: Request, res: Response): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const info = await portalService.getVerifyInfo(token);
  res.json({
    success: true,
    data: info,
  });
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    throw new AppError('QR token is required.', 400);
  }
  const result = await portalService.requestOtp(token);
  res.json(result);
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { token, otp } = req.body;
  if (!token || !otp) {
    throw new AppError('Both token and OTP are required.', 400);
  }
  const result = await portalService.verifyOtp(token, otp);

  // Set secure HTTP-only cookie
  const isProd = env.NODE_ENV === 'production';
  res.cookie('mm_customer_session', result.sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });

  res.json({
    success: true,
    sessionToken: result.sessionToken,
    message: result.message,
  });
};

export const getMe = async (req: CustomerPortalRequest, res: Response): Promise<void> => {
  if (!req.customer) throw new AppError('Unauthorized', 401);
  const profile = await portalService.getCustomerProfile(req.customer.id, req.customer.businessId);
  res.json({
    success: true,
    data: profile,
  });
};

export const getToday = async (req: CustomerPortalRequest, res: Response): Promise<void> => {
  if (!req.customer) throw new AppError('Unauthorized', 401);
  const today = await portalService.getTodayDelivery(req.customer.id, req.customer.businessId);
  res.json({
    success: true,
    data: today,
  });
};

export const getDeliveries = async (req: CustomerPortalRequest, res: Response): Promise<void> => {
  if (!req.customer) throw new AppError('Unauthorized', 401);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const history = await portalService.getDeliveryHistory(req.customer.id, req.customer.businessId, limit);
  res.json({
    success: true,
    data: history,
  });
};

export const getPayments = async (req: CustomerPortalRequest, res: Response): Promise<void> => {
  if (!req.customer) throw new AppError('Unauthorized', 401);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const payments = await portalService.getPaymentHistory(req.customer.id, req.customer.businessId, limit);
  res.json({
    success: true,
    data: payments,
  });
};

export const getStatement = async (req: CustomerPortalRequest, res: Response): Promise<void> => {
  if (!req.customer) throw new AppError('Unauthorized', 401);
  const statement = await portalService.getCustomerStatement(req.customer.id, req.customer.businessId);
  res.json({
    success: true,
    data: statement,
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('mm_customer_session', { path: '/' });
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
};
