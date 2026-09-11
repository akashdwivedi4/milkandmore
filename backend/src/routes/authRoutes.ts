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

const router = Router();

router.post('/register', authRateLimiter, asyncHandler(register));
router.post('/login', authRateLimiter, asyncHandler(login));
router.get('/me', authMiddleware, asyncHandler(getMe));
router.post('/setup', authMiddleware, asyncHandler(completeOnboarding));
router.post('/change-password', authMiddleware, asyncHandler(changePassword));

export default router;
