import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierLedgerHandler,
} from '../controllers/supplierController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireOwnerOrAdmin, asyncHandler(getSuppliers));
router.get('/:id', requireOwnerOrAdmin, asyncHandler(getSupplierById));
router.get('/:id/ledger', requireOwnerOrAdmin, asyncHandler(getSupplierLedgerHandler));
router.post('/', requireOwnerOrAdmin, asyncHandler(createSupplier));
router.put('/:id', requireOwnerOrAdmin, asyncHandler(updateSupplier));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteSupplier));

export default router;
