import { Router } from 'express';
import {
  getChartOfAccounts,
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getCashBook,
  getBankUpiLedger,
  getDayBook,
  getJournalEntries,
  getReceivableAgeing,
  getPayableAgeing,
  recordTransfer,
  getReconciliation,
} from '../controllers/accountingController';
import { authMiddleware } from '../middleware/auth';
import { requireOwnerOrAdmin, requireAnyStaff } from '../middleware/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/chart-of-accounts', requireAnyStaff, asyncHandler(getChartOfAccounts));
router.get('/general-ledger', requireOwnerOrAdmin, asyncHandler(getGeneralLedger));
router.get('/journal-entries', requireOwnerOrAdmin, asyncHandler(getJournalEntries));
router.get('/trial-balance', requireOwnerOrAdmin, asyncHandler(getTrialBalance));
router.get('/profit-loss', requireOwnerOrAdmin, asyncHandler(getProfitAndLoss));
router.get('/balance-sheet', requireOwnerOrAdmin, asyncHandler(getBalanceSheet));
router.get('/cash-book', requireOwnerOrAdmin, asyncHandler(getCashBook));
router.get('/bank-upi-ledger', requireOwnerOrAdmin, asyncHandler(getBankUpiLedger));
router.get('/day-book', requireAnyStaff, asyncHandler(getDayBook));
router.get('/receivable-ageing', requireOwnerOrAdmin, asyncHandler(getReceivableAgeing));
router.get('/payable-ageing', requireOwnerOrAdmin, asyncHandler(getPayableAgeing));
router.post('/transfer', requireOwnerOrAdmin, asyncHandler(recordTransfer));
router.get('/reconciliation', requireOwnerOrAdmin, asyncHandler(getReconciliation));

export default router;
