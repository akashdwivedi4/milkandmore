import { Router } from 'express';
import {
  getPayments,
  createPaymentHandler,
  deletePaymentHandler,
} from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAnyStaff, asyncHandler(getPayments));
router.post('/', requireAnyStaff, idempotencyMiddleware, asyncHandler(createPaymentHandler));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deletePaymentHandler));

export default router;
