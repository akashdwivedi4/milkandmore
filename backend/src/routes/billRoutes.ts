import { Router } from 'express';
import { getCustomerStatement } from '../controllers/billController';
import { authMiddleware } from '../middleware/auth';
import { requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/statement', requireAnyStaff, asyncHandler(getCustomerStatement));
router.get('/statement/:id', requireAnyStaff, asyncHandler(getCustomerStatement));

export default router;
