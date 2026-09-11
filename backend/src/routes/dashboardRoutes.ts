import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';
import { requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAnyStaff, asyncHandler(getDashboard));

export default router;
