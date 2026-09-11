import { Router } from 'express';
import {
  getExpenses,
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
} from '../controllers/expenseController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireOwnerOrAdmin, asyncHandler(getExpenses));
router.post('/', requireOwnerOrAdmin, asyncHandler(createExpenseHandler));
router.put('/:id', requireOwnerOrAdmin, asyncHandler(updateExpenseHandler));
router.delete('/:id', requireOwnerOrAdmin, asyncHandler(deleteExpenseHandler));

export default router;
