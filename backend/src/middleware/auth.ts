import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Types } from 'mongoose';

export const DEV_BUSINESS_ID = '000000000000000000000001';
export const DEV_USER_ID = '000000000000000000000002';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const devRoleHeader = req.headers['x-dev-role'] as UserRole | undefined;
    const devBizHeader = req.headers['x-dev-business-id'] as string | undefined;
    const devUserHeader = req.headers['x-dev-user-id'] as string | undefined;

    // Support dev/test tokens
    if (authHeader === 'Bearer dev-token') {
      const bizId = devBizHeader && Types.ObjectId.isValid(devBizHeader) ? devBizHeader : DEV_BUSINESS_ID;
      const uId = devUserHeader && Types.ObjectId.isValid(devUserHeader) ? devUserHeader : DEV_USER_ID;

      // Ensure business and user exist or have fallbacks in test mode
      let biz = await Business.findById(bizId);
      if (!biz) {
        biz = await Business.create({
          _id: new Types.ObjectId(bizId),
          name: 'Dev Dairy Farm',
          ownerName: 'Dev Owner',
          mobile: '9876543210',
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          setupCompleted: true,
          openingCash: 10000,
          openingUpi: 5000,
          openingBank: 25000,
        });
      }

      let user = await User.findById(uId);
      if (!user) {
        user = await User.create({
          _id: new Types.ObjectId(uId),
          businessId: biz._id,
          name: 'Dev Owner User',
          email: 'dev.owner@example.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
          role: devRoleHeader || 'OWNER',
          isActive: true,
        });
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        business_id: biz._id.toString(),
        role: devRoleHeader || user.role,
        name: user.name,
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token || !token.trim()) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
      return;
    }

    let payload: any;
    try {
      payload = verifyToken(token);
    } catch (tokenErr: any) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.',
      });
      return;
    }

    if (!payload || !payload.userId || !payload.businessId) {
      res.status(401).json({
        success: false,
        error: 'Malformed authentication token.',
      });
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account not found.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact your administrator.',
      });
      return;
    }

    const business = await Business.findById(user.businessId);
    if (!business) {
      res.status(403).json({
        success: false,
        error: 'Business account not found.',
      });
      return;
    }

    // In dev/test, allow role switching header for testing role gates
    const effectiveRole = (process.env.NODE_ENV !== 'production' && devRoleHeader) ? devRoleHeader : user.role;

    req.user = {
      id: user._id.toString(),
      email: user.email,
      business_id: business._id.toString(),
      role: effectiveRole,
      name: user.name,
    };

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Authentication failure: ' + (err?.message || 'Unknown error'),
    });
  }
};
