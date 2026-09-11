import { Router } from 'express';
import {
  getSupplierPayments,
  createSupplierPaymentHandler,
  deleteSupplierPaymentHandler,
} from '../controllers/supplierPaymentController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin } from '../middleware/roles';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireOwnerOrAdmin, asyncHandler(getSupplierPayments));
router.post('/', requireOwnerOrAdmin, idempotencyMiddleware, asyncHandler(createSupplierPaymentHandler));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteSupplierPaymentHandler));

export default router;
