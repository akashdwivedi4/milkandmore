import { Router } from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  activateProduct,
  deactivateProduct,
  getCustomerRates,
  setCustomerRate,
} from '../controllers/productController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAnyStaff, asyncHandler(getProducts));
router.post('/', requireOwnerOrAdmin, asyncHandler(createProduct));
router.patch('/:id', requireOwnerOrAdmin, asyncHandler(updateProduct));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteProduct));
router.post('/:id/activate', requireOwnerOrAdmin, asyncHandler(activateProduct));
router.post('/:id/deactivate', requireOwnerOrAdmin, asyncHandler(deactivateProduct));
router.get('/customer/:customerId/rates', requireAnyStaff, asyncHandler(getCustomerRates));
router.post('/rates', requireOwnerOrAdmin, asyncHandler(setCustomerRate));

export default router;
