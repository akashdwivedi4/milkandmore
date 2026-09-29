import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer';
import { env } from '../config/env';

export interface CustomerAuthPayload {
  customerId: string;
  businessId: string;
  portalToken: string;
  role: string;
}

export interface CustomerPortalRequest extends Request {
  customer?: {
    id: string;
    businessId: string;
    portalToken: string;
  };
}

function parseCookie(cookieHeader?: string, cookieName: string = 'mm_customer_session'): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const customerAuthMiddleware = async (
  req: CustomerPortalRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim() || null;
    }

    if (!token && req.headers.cookie) {
      token = parseCookie(req.headers.cookie, 'mm_customer_session');
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please verify with OTP.',
      });
      return;
    }

    let payload: CustomerAuthPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as CustomerAuthPayload;
    } catch {
      res.status(401).json({
        success: false,
        error: 'Session expired or invalid. Please verify with OTP again.',
      });
      return;
    }

    if (!payload || payload.role !== 'CUSTOMER_PORTAL' || !payload.customerId || !payload.businessId) {
      res.status(403).json({
        success: false,
        error: 'Invalid customer portal session.',
      });
      return;
    }

    const customer = await Customer.findOne({
      _id: payload.customerId,
      businessId: payload.businessId,
      isDeleted: false,
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'Customer account not found.',
      });
      return;
    }

    // Verify token has not been revoked or regenerated
    if (customer.portalTokenRevoked || customer.customerPortalToken !== payload.portalToken) {
      res.status(401).json({
        success: false,
        error: 'This QR code access has been revoked or updated. Please scan the latest QR code.',
      });
      return;
    }

    req.customer = {
      id: customer._id.toString(),
      businessId: customer.businessId.toString(),
      portalToken: payload.portalToken,
    };

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Authentication failure: ' + (err?.message || 'Unknown error'),
    });
  }
};
