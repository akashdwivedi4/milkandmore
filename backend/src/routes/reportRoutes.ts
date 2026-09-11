import { Router } from 'express';
import {
  getProfitAndLossHandler,
  getBalanceSheetHandler,
  getAccountBalancesHandler,
  getDailyReportHandler,
  getProductReportHandler,
  getCustomerReportHandler,
} from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/pnl', requireOwnerOrAdmin, asyncHandler(getProfitAndLossHandler));
router.get('/balance-sheet', requireOwnerOrAdmin, asyncHandler(getBalanceSheetHandler));
router.get('/accounts', requireOwnerOrAdmin, asyncHandler(getAccountBalancesHandler));
router.get('/daily', requireAnyStaff, asyncHandler(getDailyReportHandler));
router.get('/products', requireOwnerOrAdmin, asyncHandler(getProductReportHandler));
router.get('/customers', requireOwnerOrAdmin, asyncHandler(getCustomerReportHandler));

export default router;
