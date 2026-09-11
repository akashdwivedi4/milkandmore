import { Router } from 'express';
import {
  generateQRs,
  listQRs,
  resolveQR,
  assignQR,
} from '../controllers/qrController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.post('/generate', requireOwnerOrAdmin, asyncHandler(generateQRs));
router.get('/', requireAnyStaff, asyncHandler(listQRs));
router.get('/:qrCode', requireAnyStaff, asyncHandler(resolveQR));
router.post('/assign', requireAnyStaff, asyncHandler(assignQR));

export default router;
