import { Router } from 'express';
import {
  getVerifyInfo,
  requestOtp,
  verifyOtp,
  getMe,
  getToday,
  getDeliveries,
  getPayments,
  getStatement,
  logout,
} from '../controllers/customerPortalController';
import { customerAuthMiddleware } from '../middleware/customerAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public routes (before verification)
router.get('/verify-info/:token', asyncHandler(getVerifyInfo));
router.post('/request-otp', asyncHandler(requestOtp));
router.post('/verify-otp', asyncHandler(verifyOtp));

// Protected routes (strictly isolated to the verified customer session)
router.use(asyncHandler(customerAuthMiddleware as any));

router.get('/me', asyncHandler(getMe as any));
router.get('/today', asyncHandler(getToday as any));
router.get('/deliveries', asyncHandler(getDeliveries as any));
router.get('/payments', asyncHandler(getPayments as any));
router.get('/statement', asyncHandler(getStatement as any));
router.post('/logout', asyncHandler(logout as any));

export default router;
