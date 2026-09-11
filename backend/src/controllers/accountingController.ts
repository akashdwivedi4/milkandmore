import { Response } from 'express';
import { AuthRequest } from '../types';
import * as accountingService from '../services/accountingService';
import { AppError } from '../middleware/errorHandler';

export const getChartOfAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  res.json({
    success: true,
    data: Object.values(accountingService.CHART_OF_ACCOUNTS),
  });
};

export const getGeneralLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { accountCode, startDate, endDate, partyId } = req.query;

  const data = await accountingService.getGeneralLedger(req.user.business_id, {
    accountCode: accountCode as string,
    startDate: startDate as string,
    endDate: endDate as string,
    partyId: partyId as string,
  });

  res.json({ success: true, data });
};

export const getTrialBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { asOfDate } = req.query;

  const data = await accountingService.getTrialBalance(req.user.business_id, asOfDate as string);
  res.json({ success: true, data });
};

export const getProfitAndLoss = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { startDate, endDate } = req.query;

  const data = await accountingService.getProfitAndLossStatement(
    req.user.business_id,
    startDate as string,
    endDate as string
  );
  res.json({ success: true, data });
};

export const getBalanceSheet = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { asOfDate } = req.query;

  const data = await accountingService.getBalanceSheetStatement(req.user.business_id, asOfDate as string);
  res.json({ success: true, data });
};

export const getCashBook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { startDate, endDate } = req.query;

  const data = await accountingService.getCashBook(req.user.business_id, startDate as string, endDate as string);
  res.json({ success: true, data });
};

export const getBankUpiLedger = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { type, startDate, endDate } = req.query;
  const accType = ((type as string) || 'BANK').toUpperCase() as 'BANK' | 'UPI';

  const data = await accountingService.getBankUpiLedger(req.user.business_id, accType, startDate as string, endDate as string);
  res.json({ success: true, data });
};

export const getDayBook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { date } = req.query;

  const data = await accountingService.getDayBook(req.user.business_id, date as string);
  res.json({ success: true, data });
};

export const getReceivableAgeing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const data = await accountingService.getReceivableAgeing(req.user.business_id);
  res.json({ success: true, data });
};

export const getPayableAgeing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const data = await accountingService.getPayableAgeing(req.user.business_id);
  res.json({ success: true, data });
};

export const recordTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const { fromAccount, toAccount, amount, date, notes } = req.body;

  if (!fromAccount || !toAccount || !amount) {
    throw new AppError('From account, to account, and amount are required.', 400);
  }

  const data = await accountingService.recordInternalTransfer(req.user.business_id, req.user.id, {
    fromAccount,
    toAccount,
    amount: Number(amount),
    date,
    notes,
  });

  res.status(201).json({
    success: true,
    message: 'Internal transfer recorded successfully.',
    data,
  });
};

export const getReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const data = await accountingService.getReconciliationReport(req.user.business_id);
  res.json({ success: true, data });
};
