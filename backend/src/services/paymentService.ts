import { Types } from 'mongoose';
import { CustomerPayment, ICustomerPayment, PaymentMode } from '../models/CustomerPayment';
import { SupplierPayment, ISupplierPayment } from '../models/SupplierPayment';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { updateAccountBalance } from './accountService';
import { logAudit } from './auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { roundMoney } from '../utils/math';
import { getTodayDateString } from '../utils/date';
import { JournalEntry } from '../models/JournalEntry';
import {
  postJournalEntry,
  reverseJournalEntry,
  CHART_OF_ACCOUNTS,
  getPaymentAccountByMode,
} from './accountingService';

export const recordCustomerPayment = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: {
    customerId?: string;
    customer_id?: string;
    amount: number;
    paymentMode?: string;
    payment_method?: string;
    paymentDate?: string;
    payment_date?: string;
    paid_at?: string;
    referenceNumber?: string;
    reference_number?: string;
    notes?: string;
    idempotencyKey?: string;
  }
): Promise<ICustomerPayment> => {
  const bizId = new Types.ObjectId(businessId);
  const custId = new Types.ObjectId(params.customerId || params.customer_id);
  const amount = roundMoney(Number(params.amount));
  const mode = ((params.paymentMode || params.payment_method || 'CASH').toUpperCase()) as PaymentMode;
  const paymentDate = params.paymentDate || params.payment_date || params.paid_at || getTodayDateString();

  if (amount <= 0) {
    throw new AppError('Payment amount must be greater than 0.', 400);
  }

  return await runInTransaction(async (session) => {
    const customer = await Customer.findOne({ _id: custId, businessId: bizId }).session(session || null);
    if (!customer) {
      throw new AppError('Customer not found.', 404);
    }

    const paymentDocs = await CustomerPayment.create(
      [
        {
          businessId: bizId,
          customerId: custId,
          paymentDate,
          amount,
          paymentMode: mode,
          referenceNumber: params.referenceNumber || params.reference_number || '',
          notes: params.notes || '',
          idempotencyKey: params.idempotencyKey,
          recordedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ],
      { session: session || undefined }
    );

    const payment = paymentDocs[0];

    // Customer payment received: add to cash/upi/bank balance
    if (['CASH', 'UPI', 'BANK'].includes(mode)) {
      await updateAccountBalance(bizId, mode, amount, session);
    }

    // Double-entry accounting: Debit Cash/Bank/UPI, Credit Customer Receivables
    const destAccount = getPaymentAccountByMode(mode);
    await postJournalEntry(
      {
        businessId: bizId,
        date: paymentDate,
        sourceType: 'CUSTOMER_PAYMENT',
        sourceId: payment._id,
        narration: `Payment received from ${customer.name} via ${mode}${payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : ''}`,
        lines: [
          {
            accountCode: destAccount.code,
            accountName: destAccount.name,
            accountType: 'ASSET',
            debit: amount,
            credit: 0,
          },
          {
            accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
            accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
            accountType: 'ASSET',
            debit: 0,
            credit: amount,
            partyType: 'CUSTOMER',
            partyId: custId,
            partyName: customer.name,
          },
        ],
        userId,
      },
      session
    );

    await logAudit(
      bizId,
      userId,
      'STAFF',
      'CUSTOMER_PAYMENT',
      'CustomerPayment',
      payment._id.toString(),
      {
        customerId: custId.toString(),
        amount,
        paymentMode: mode,
      },
      session
    );

    return payment;
  });
};

export const deleteCustomerPayment = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  paymentId: string | Types.ObjectId
): Promise<void> => {
  const bizId = new Types.ObjectId(businessId);
  const payId = new Types.ObjectId(paymentId);

  await runInTransaction(async (session) => {
    const payment = await CustomerPayment.findOne({ _id: payId, businessId: bizId }).session(
      session || null
    );
    if (!payment) {
      throw new AppError('Payment not found.', 404);
    }

    // Reverse account balance effect
    if (['CASH', 'UPI', 'BANK'].includes(payment.paymentMode)) {
      await updateAccountBalance(bizId, payment.paymentMode, -payment.amount, session);
    }

    // Reverse journal entry
    const previousJournal = await JournalEntry.findOne({
      businessId: bizId,
      sourceType: 'CUSTOMER_PAYMENT',
      sourceId: payId,
      isReversed: false,
    }).session(session || null);

    if (previousJournal) {
      await reverseJournalEntry(bizId, previousJournal._id, 'Reversal on customer payment deletion', userId, session);
    }

    await CustomerPayment.deleteOne({ _id: payId, businessId: bizId }).session(session || null);

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'DELETE_CUSTOMER_PAYMENT',
      'CustomerPayment',
      payId.toString(),
      {
        amount: payment.amount,
      },
      session
    );
  });
};

export const recordSupplierPayment = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: {
    supplierId?: string;
    supplier_id?: string;
    amount: number;
    paymentMode?: string;
    payment_method?: string;
    paymentDate?: string;
    payment_date?: string;
    referenceNumber?: string;
    reference_number?: string;
    notes?: string;
    idempotencyKey?: string;
  }
): Promise<ISupplierPayment> => {
  const bizId = new Types.ObjectId(businessId);
  const suppId = new Types.ObjectId(params.supplierId || params.supplier_id);
  const amount = roundMoney(Number(params.amount));
  const mode = ((params.paymentMode || params.payment_method || 'CASH').toUpperCase()) as PaymentMode;
  const paymentDate = params.paymentDate || params.payment_date || getTodayDateString();

  if (amount <= 0) {
    throw new AppError('Payment amount must be greater than 0.', 400);
  }

  return await runInTransaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId }).session(session || null);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    const paymentDocs = await SupplierPayment.create(
      [
        {
          businessId: bizId,
          supplierId: suppId,
          paymentDate,
          amount,
          paymentMode: mode,
          referenceNumber: params.referenceNumber || params.reference_number || '',
          notes: params.notes || '',
          idempotencyKey: params.idempotencyKey,
          recordedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ],
      { session: session || undefined }
    );

    const payment = paymentDocs[0];

    // Deduct payable from supplier
    supplier.currentPayable = roundMoney(
      Math.max(0, (supplier.currentPayable || 0) - amount)
    );
    await supplier.save({ session: session || undefined });

    // Deduct from business cash/upi/bank balance
    if (['CASH', 'UPI', 'BANK'].includes(mode)) {
      await updateAccountBalance(bizId, mode, -amount, session);
    }

    // Double-entry accounting: Debit Supplier Payables, Credit Cash/Bank/UPI
    const sourceAccount = getPaymentAccountByMode(mode);
    await postJournalEntry(
      {
        businessId: bizId,
        date: paymentDate,
        sourceType: 'SUPPLIER_PAYMENT',
        sourceId: payment._id,
        narration: `Payment made to ${supplier.name} via ${mode}${payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : ''}`,
        lines: [
          {
            accountCode: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code,
            accountName: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.name,
            accountType: 'LIABILITY',
            debit: amount,
            credit: 0,
            partyType: 'SUPPLIER',
            partyId: suppId,
            partyName: supplier.name,
          },
          {
            accountCode: sourceAccount.code,
            accountName: sourceAccount.name,
            accountType: 'ASSET',
            debit: 0,
            credit: amount,
          },
        ],
        userId,
      },
      session
    );

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'SUPPLIER_PAYMENT',
      'SupplierPayment',
      payment._id.toString(),
      {
        supplierId: suppId.toString(),
        amount,
        paymentMode: mode,
      },
      session
    );

    return payment;
  });
};

export const deleteSupplierPayment = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  paymentId: string | Types.ObjectId
): Promise<void> => {
  const bizId = new Types.ObjectId(businessId);
  const payId = new Types.ObjectId(paymentId);

  await runInTransaction(async (session) => {
    const payment = await SupplierPayment.findOne({ _id: payId, businessId: bizId }).session(
      session || null
    );
    if (!payment) {
      throw new AppError('Supplier payment not found.', 404);
    }

    // Restore supplier payable
    const supplier = await Supplier.findOne({ _id: payment.supplierId, businessId: bizId }).session(
      session || null
    );
    if (supplier) {
      supplier.currentPayable = roundMoney((supplier.currentPayable || 0) + payment.amount);
      await supplier.save({ session: session || undefined });
    }

    // Restore cash/upi/bank balance
    if (['CASH', 'UPI', 'BANK'].includes(payment.paymentMode)) {
      await updateAccountBalance(bizId, payment.paymentMode, payment.amount, session);
    }

    // Reverse journal entry
    const previousJournal = await JournalEntry.findOne({
      businessId: bizId,
      sourceType: 'SUPPLIER_PAYMENT',
      sourceId: payId,
      isReversed: false,
    }).session(session || null);

    if (previousJournal) {
      await reverseJournalEntry(bizId, previousJournal._id, 'Reversal on supplier payment deletion', userId, session);
    }

    await SupplierPayment.deleteOne({ _id: payId, businessId: bizId }).session(session || null);

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'DELETE_SUPPLIER_PAYMENT',
      'SupplierPayment',
      payId.toString(),
      {
        amount: payment.amount,
      },
      session
    );
  });
};
