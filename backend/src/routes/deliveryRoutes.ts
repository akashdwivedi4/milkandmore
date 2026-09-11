import { Router } from 'express';
import {
  createDeliveryHandler,
  getDeliveries,
  checkTodayDelivery,
  updateDeliveryHandler,
  deleteDeliveryHandler,
  getRouteDeliveries,
  getNearbyCustomers,
} from '../controllers/deliveryController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.post('/', requireAnyStaff, idempotencyMiddleware, asyncHandler(createDeliveryHandler));
router.get('/', requireAnyStaff, asyncHandler(getDeliveries));
router.get('/check-today/:customerId', requireAnyStaff, asyncHandler(checkTodayDelivery));
router.get('/route', requireAnyStaff, asyncHandler(getRouteDeliveries));
router.get('/nearby', requireAnyStaff, asyncHandler(getNearbyCustomers));
router.patch('/:id', requireOwnerOrAdmin, idempotencyMiddleware, asyncHandler(updateDeliveryHandler));
router.put('/:id', requireOwnerOrAdmin, idempotencyMiddleware, asyncHandler(updateDeliveryHandler));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteDeliveryHandler));

export default router;
