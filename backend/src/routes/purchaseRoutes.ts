import { Router } from 'express';
import {
  getPurchases,
  createPurchaseHandler,
  deletePurchaseHandler,
} from '../controllers/purchaseController';
import {
  getPurchaseReturnsHandler,
  createPurchaseReturnHandler,
} from '../controllers/purchaseReturnController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin } from '../middleware/roles';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/returns', requireOwnerOrAdmin, asyncHandler(getPurchaseReturnsHandler));
router.post('/returns', requireOwnerOrAdmin, idempotencyMiddleware, asyncHandler(createPurchaseReturnHandler));

router.get('/', requireOwnerOrAdmin, asyncHandler(getPurchases));
router.post('/', requireOwnerOrAdmin, idempotencyMiddleware, asyncHandler(createPurchaseHandler));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deletePurchaseHandler));

export default router;
