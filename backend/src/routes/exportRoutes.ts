import { Router } from 'express';
import { exportData } from '../controllers/exportController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/:type', requireOwnerOrAdmin, asyncHandler(exportData));

export default router;
