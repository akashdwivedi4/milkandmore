import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerByQr,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  reactivateCustomer,
  updateCustomerLocation,
  deleteCustomer,
  regenerateCustomerQr,
  revokeCustomerQr,
  refundCustomerCreditHandler,
} from '../controllers/customerController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAnyStaff, asyncHandler(getCustomers));
router.get('/qr/:token', requireAnyStaff, asyncHandler(getCustomerByQr));
router.get('/:id', requireAnyStaff, asyncHandler(getCustomerById));
router.post('/', requireAnyStaff, asyncHandler(createCustomer));
router.patch('/:id', requireAnyStaff, asyncHandler(updateCustomer));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteCustomer));
router.post('/:id/refund-credit', requireOwnerOrAdmin, asyncHandler(refundCustomerCreditHandler));
router.post('/:id/reactivate', requireOwnerOrAdmin, asyncHandler(reactivateCustomer));
router.post('/:id/deactivate', requireOwnerOrAdmin, asyncHandler(deactivateCustomer));
router.post('/:id/regenerate-qr', requireOwnerOrAdmin, asyncHandler(regenerateCustomerQr));
router.post('/:id/revoke-qr', requireOwnerOrAdmin, asyncHandler(revokeCustomerQr));
router.patch('/:id/location', requireAnyStaff, asyncHandler(updateCustomerLocation));

export default router;
