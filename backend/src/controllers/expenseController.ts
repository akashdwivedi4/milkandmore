import { Response } from 'express';
import { AuthRequest } from '../types';
import { Expense } from '../models/Expense';
import { updateAccountBalance } from '../services/accountService';
import { logAudit } from '../services/auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { roundMoney } from '../utils/math';
import { getTodayDateString } from '../utils/date';
import { Types } from 'mongoose';
import {
  postJournalEntry,
  reverseJournalEntry,
  getExpenseAccountByCategory,
  getPaymentAccountByMode,
} from '../services/accountingService';

export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { category, start_date, startDate, end_date, endDate } = req.query;
  const filter: any = { businessId: new Types.ObjectId(req.user.business_id) };

  if (category && category !== 'ALL') {
    filter.category = String(category);
  }

  const sDate = start_date || startDate;
  const eDate = end_date || endDate;
  if (sDate || eDate) {
    filter.expenseDate = {};
    if (sDate) filter.expenseDate.$gte = String(sDate);
    if (eDate) filter.expenseDate.$lte = String(eDate);
  }

  const expenses = await Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 });

  const mapped = expenses.map((e) => ({
    id: e._id.toString(),
    business_id: e.businessId.toString(),
    category: e.category,
    description: e.description,
    amount: e.amount,
    expense_date: e.expenseDate,
    payment_method: e.paymentMode,
    payment_mode: e.paymentMode,
    notes: e.notes,
    created_at: e.createdAt.toISOString(),
  }));

  res.json({
    success: true,
    data: mapped,
  });
};

export const createExpenseHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { category, description, amount, expense_date, expenseDate, payment_method, paymentMode, notes } =
    req.body;

  if (!category || !description || amount === undefined) {
    throw new AppError('Category, description, and amount are required.', 400);
  }

  const expAmount = roundMoney(Number(amount));
  const expDate = expense_date || expenseDate || getTodayDateString();
  const mode = ((payment_method || paymentMode || 'CASH').toUpperCase()) as 'CASH' | 'UPI' | 'BANK';

  const expense = await runInTransaction(async (session) => {
    const expenseDocs = await Expense.create(
      [
        {
          businessId: new Types.ObjectId(req.user!.business_id),
          category: category.trim(),
          description: description.trim(),
          amount: expAmount,
          expenseDate: expDate,
          paymentMode: mode,
          notes: notes?.trim() || '',
          recordedBy: new Types.ObjectId(req.user!.id),
        },
      ],
      { session: session || undefined }
    );

    const createdExpense = expenseDocs[0];

    // Deduct expense amount from financial account balance
    await updateAccountBalance(req.user!.business_id, mode, -expAmount, session);

    // Double-entry accounting: Debit Expense Category, Credit Cash/Bank/UPI
    if (expAmount > 0) {
      const expAcc = getExpenseAccountByCategory(category);
      const payAcc = getPaymentAccountByMode(mode);
      await postJournalEntry(
        {
          businessId: req.user!.business_id,
          entryDate: expDate,
          entryType: 'EXPENSE',
          referenceType: 'EXPENSE',
          referenceId: createdExpense._id.toString(),
          narration: `Expense: ${category} - ${description.trim()}`,
          lines: [
            {
              accountCode: expAcc.code,
              accountName: expAcc.name,
              accountType: 'EXPENSE',
              debit: expAmount,
              credit: 0,
            },
            {
              accountCode: payAcc.code,
              accountName: payAcc.name,
              accountType: 'ASSET',
              debit: 0,
              credit: expAmount,
            },
          ],
        },
        session
      );
    }

    await logAudit(
      req.user!.business_id,
      req.user!.id,
      req.user!.role,
      'CREATE_EXPENSE',
      'Expense',
      createdExpense._id.toString(),
      { amount: expAmount, category, paymentMode: mode },
      session
    );

    return createdExpense;
  });

  res.status(201).json({
    success: true,
    data: expense,
    message: 'Expense recorded successfully.',
  });
};

export const updateExpenseHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { category, description, amount, expense_date, expenseDate, payment_method, paymentMode, notes } =
    req.body;

  const expense = await runInTransaction(async (session) => {
    const exp = await Expense.findOne({
      _id: req.params.id,
      businessId: req.user!.business_id,
    }).session(session || null);

    if (!exp) throw new AppError('Expense not found.', 404);

    const oldAmount = exp.amount;
    const oldMode = exp.paymentMode;

    if (category !== undefined) exp.category = category.trim();
    if (description !== undefined) exp.description = description.trim();
    if (notes !== undefined) exp.notes = notes.trim();
    if (expense_date !== undefined || expenseDate !== undefined) {
      exp.expenseDate = expense_date || expenseDate;
    }

    const newAmount = amount !== undefined ? roundMoney(Number(amount)) : oldAmount;
    const newMode = (payment_method || paymentMode ? (payment_method || paymentMode).toUpperCase() : oldMode) as any;

    // Reconcile account balance: reverse old deduction, apply new deduction
    await updateAccountBalance(req.user!.business_id, oldMode, oldAmount, session);
    await updateAccountBalance(req.user!.business_id, newMode, -newAmount, session);

    exp.amount = newAmount;
    exp.paymentMode = newMode;
    await exp.save({ session: session || undefined });

    // Reverse old journal entry and post new journal entry
    await reverseJournalEntry(
      req.user!.business_id,
      'EXPENSE',
      exp._id.toString(),
      'Update expense adjustment',
      session
    );

    if (newAmount > 0) {
      const expAcc = getExpenseAccountByCategory(exp.category);
      const payAcc = getPaymentAccountByMode(newMode);
      await postJournalEntry(
        {
          businessId: req.user!.business_id,
          entryDate: exp.expenseDate,
          entryType: 'EXPENSE',
          referenceType: 'EXPENSE',
          referenceId: exp._id.toString(),
          narration: `Expense updated: ${exp.category} - ${exp.description}`,
          lines: [
            {
              accountCode: expAcc.code,
              accountName: expAcc.name,
              accountType: 'EXPENSE',
              debit: newAmount,
              credit: 0,
            },
            {
              accountCode: payAcc.code,
              accountName: payAcc.name,
              accountType: 'ASSET',
              debit: 0,
              credit: newAmount,
            },
          ],
        },
        session
      );
    }

    return exp;
  });

  res.json({
    success: true,
    data: expense,
  });
};

export const deleteExpenseHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  await runInTransaction(async (session) => {
    const exp = await Expense.findOne({
      _id: req.params.id,
      businessId: req.user!.business_id,
    }).session(session || null);

    if (!exp) throw new AppError('Expense not found.', 404);

    // Refund account balance
    await updateAccountBalance(req.user!.business_id, exp.paymentMode, exp.amount, session);

    // Reverse journal entry
    await reverseJournalEntry(
      req.user!.business_id,
      'EXPENSE',
      exp._id.toString(),
      'Delete expense reversal',
      session
    );

    await Expense.deleteOne({ _id: exp._id, businessId: req.user!.business_id }).session(
      session || null
    );

    await logAudit(
      req.user!.business_id,
      req.user!.id,
      req.user!.role,
      'DELETE_EXPENSE',
      'Expense',
      exp._id.toString(),
      { amount: exp.amount },
      session
    );
  });

  res.json({
    success: true,
    message: 'Expense deleted and balance refunded successfully.',
  });
};
