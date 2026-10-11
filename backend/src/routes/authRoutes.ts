import { Router } from 'express';
import {
  register,
  login,
  getMe,
  completeOnboarding,
  changePassword,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

const requireOwner = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'OWNER') return next();
  res.status(403).json({ success: false, error: 'Owner access required.' });
};

const router = Router();

router.post('/register', authRateLimiter, asyncHandler(register));
router.post('/login', authRateLimiter, asyncHandler(login));
router.get('/me', authMiddleware, asyncHandler(getMe));
router.post('/setup', authMiddleware, requireOwner, asyncHandler(completeOnboarding));
router.post('/change-password', authMiddleware, asyncHandler(changePassword));

export default router;
