import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getStaff,
  addStaff,
} from '../controllers/settingsController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAnyStaff, asyncHandler(getSettings));
router.patch('/', requireOwnerOrAdmin, asyncHandler(updateSettings));
router.get('/staff', requireOwnerOrAdmin, asyncHandler(getStaff));
router.post('/staff', requireOwnerOrAdmin, asyncHandler(addStaff));

export default router;
