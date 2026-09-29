import { Types } from 'mongoose';
import { CustomerPayment, ICustomerPayment, PaymentMode } from '../models/CustomerPayment';
import { SupplierPayment, ISupplierPayment } from '../models/SupplierPayment';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';
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
          paymentType: 'PAYMENT',
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

    // Determine prior outstanding to split between settling receivables and customer advance credit
    const [allPriorDeliveries, allPriorPayments] = await Promise.all([
      Delivery.find({ businessId: bizId, customerId: custId, status: 'DELIVERED' }).session(session || null),
      CustomerPayment.find({ businessId: bizId, customerId: custId, _id: { $ne: payment._id } }).session(session || null),
    ]);

    const priorCharges = roundMoney(allPriorDeliveries.reduce((sum: number, d: any) => sum + (d.totalAmount || 0), 0));
    const priorPaid = roundMoney(
      allPriorPayments.reduce((sum: number, p: any) => sum + (p.paymentType === 'REFUND' ? -(p.amount || 0) : (p.amount || 0)), 0)
    );
    const opNet = customer.openingBalanceType === 'ADVANCE'
      ? -roundMoney(customer.openingBalance || 0)
      : roundMoney(customer.openingBalance || 0);
    const priorNet = roundMoney(opNet + priorCharges - priorPaid);
    const priorOutstanding = Math.max(0, priorNet);

    const appliedToOutstanding = roundMoney(Math.min(amount, priorOutstanding));
    const advanceCreditCreated = roundMoney(Math.max(0, amount - appliedToOutstanding));

    const destAccount = getPaymentAccountByMode(mode);
    const journalLines: any[] = [
      {
        accountCode: destAccount.code,
        accountName: destAccount.name,
        accountType: 'ASSET',
        debit: amount,
        credit: 0,
      },
    ];

    if (appliedToOutstanding > 0) {
      journalLines.push({
        accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
        accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
        accountType: 'ASSET',
        debit: 0,
        credit: appliedToOutstanding,
        partyType: 'CUSTOMER',
        partyId: custId,
        partyName: customer.name,
      });
    }

    if (advanceCreditCreated > 0) {
      journalLines.push({
        accountCode: CHART_OF_ACCOUNTS.CUSTOMER_ADVANCES.code,
        accountName: CHART_OF_ACCOUNTS.CUSTOMER_ADVANCES.name,
        accountType: 'LIABILITY',
        debit: 0,
        credit: advanceCreditCreated,
        partyType: 'CUSTOMER',
        partyId: custId,
        partyName: customer.name,
      });
    }

    // Double-entry accounting: Debit Cash/Bank/UPI, Credit Receivables and/or Advances
    await postJournalEntry(
      {
        businessId: bizId,
        date: paymentDate,
        sourceType: 'CUSTOMER_PAYMENT',
        sourceId: payment._id,
        narration: `Payment received from ${customer.name} via ${mode}${payment.referenceNumber ? ` (Ref: ${payment.referenceNumber})` : ''}${advanceCreditCreated > 0 ? ` [Advance: ₹${advanceCreditCreated}]` : ''}`,
        lines: journalLines,
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

export const updateCustomerPayment = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  paymentId: string | Types.ObjectId,
  updates: {
    amount?: number;
    paymentMode?: string;
    payment_method?: string;
    paymentDate?: string;
    payment_date?: string;
    referenceNumber?: string;
    notes?: string;
  }
): Promise<ICustomerPayment> => {
  const bizId = new Types.ObjectId(businessId);
  const payId = new Types.ObjectId(paymentId);

  return await runInTransaction(async (session) => {
    const payment = await CustomerPayment.findOne({ _id: payId, businessId: bizId }).session(
      session || null
    );
    if (!payment) {
      throw new AppError('Payment not found.', 404);
    }

    const oldAmount = payment.amount;
    const oldMode = payment.paymentMode;

    if (updates.amount !== undefined) {
      const newAmount = roundMoney(Number(updates.amount));
      if (newAmount <= 0) {
        throw new AppError('Payment amount must be greater than 0.', 400);
      }
      payment.amount = newAmount;
    }

    const newMode = (updates.paymentMode || updates.payment_method)
      ? (((updates.paymentMode || updates.payment_method) as string).toUpperCase() as PaymentMode)
      : oldMode;
    payment.paymentMode = newMode;

    if (updates.paymentDate || updates.payment_date) {
      payment.paymentDate = updates.paymentDate || updates.payment_date!;
    }
    if (updates.referenceNumber !== undefined) {
      payment.referenceNumber = updates.referenceNumber;
    }
    if (updates.notes !== undefined) {
      payment.notes = updates.notes;
    }

    await payment.save({ session: session || undefined });

    // Adjust account balances if mode or amount changed
    if (oldMode === newMode) {
      const diff = payment.amount - oldAmount;
      if (diff !== 0 && ['CASH', 'UPI', 'BANK'].includes(newMode)) {
        await updateAccountBalance(bizId, newMode, diff, session);
      }
    } else {
      if (['CASH', 'UPI', 'BANK'].includes(oldMode)) {
        await updateAccountBalance(bizId, oldMode, -oldAmount, session);
      }
      if (['CASH', 'UPI', 'BANK'].includes(newMode)) {
        await updateAccountBalance(bizId, newMode, payment.amount, session);
      }
    }

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'UPDATE_CUSTOMER_PAYMENT',
      'CustomerPayment',
      payId.toString(),
      {
        oldAmount,
        newAmount: payment.amount,
        oldMode,
        newMode,
      },
      session
    );

    return payment;
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

export const refundCustomerCredit = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: {
    customerId: string;
    amount: number;
    paymentMode?: string;
    paymentDate?: string;
    referenceNumber?: string;
    notes?: string;
  }
): Promise<ICustomerPayment> => {
  const bizId = new Types.ObjectId(businessId);
  const custId = new Types.ObjectId(params.customerId);
  const amount = roundMoney(Number(params.amount));
  const mode = ((params.paymentMode || 'CASH').toUpperCase()) as PaymentMode;
  const paymentDate = params.paymentDate || getTodayDateString();

  if (amount <= 0) {
    throw new AppError('Refund amount must be greater than 0.', 400);
  }

  return await runInTransaction(async (session) => {
    const customer = await Customer.findOne({ _id: custId, businessId: bizId }).session(session || null);
    if (!customer) {
      throw new AppError('Customer not found.', 404);
    }

    // Verify customer has enough advance credit to refund
    const [allDeliveries, allPayments] = await Promise.all([
      Delivery.find({ businessId: bizId, customerId: custId, status: 'DELIVERED' }).session(session || null),
      CustomerPayment.find({ businessId: bizId, customerId: custId }).session(session || null),
    ]);

    const totalCharges = roundMoney(allDeliveries.reduce((s: number, d: any) => s + (d.totalAmount || 0), 0));
    const totalPaid = roundMoney(
      allPayments.reduce((s: number, p: any) => s + (p.paymentType === 'REFUND' ? -(p.amount || 0) : (p.amount || 0)), 0)
    );
    const opNet = customer.openingBalanceType === 'ADVANCE'
      ? -roundMoney(customer.openingBalance || 0)
      : roundMoney(customer.openingBalance || 0);
    const currentNet = roundMoney(opNet + totalCharges - totalPaid);
    const availableCredit = Math.max(0, -currentNet);

    if (amount > availableCredit) {
      throw new AppError(
        `Cannot refund ₹${amount}. Customer only has ₹${availableCredit} in available advance credit.`,
        400
      );
    }

    const refundDocs = await CustomerPayment.create(
      [
        {
          businessId: bizId,
          customerId: custId,
          paymentDate,
          amount,
          paymentMode: mode,
          paymentType: 'REFUND',
          referenceNumber: params.referenceNumber || '',
          notes: params.notes || 'Customer credit refund',
          recordedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ],
      { session: session || undefined }
    );

    const refund = refundDocs[0];

    // Refund reduces Cash/Bank/UPI account balance
    if (['CASH', 'UPI', 'BANK'].includes(mode)) {
      await updateAccountBalance(bizId, mode, -amount, session);
    }

    // Double-entry accounting: Debit Customer Advances (Liability), Credit Cash/Bank/UPI (Asset)
    const sourceAccount = getPaymentAccountByMode(mode);
    await postJournalEntry(
      {
        businessId: bizId,
        date: paymentDate,
        sourceType: 'CUSTOMER_REFUND',
        sourceId: refund._id,
        narration: `Customer credit refund to ${customer.name} via ${mode}${refund.referenceNumber ? ` (Ref: ${refund.referenceNumber})` : ''}`,
        lines: [
          {
            accountCode: CHART_OF_ACCOUNTS.CUSTOMER_ADVANCES.code,
            accountName: CHART_OF_ACCOUNTS.CUSTOMER_ADVANCES.name,
            accountType: 'LIABILITY',
            debit: amount,
            credit: 0,
            partyType: 'CUSTOMER',
            partyId: custId,
            partyName: customer.name,
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
      'CUSTOMER_REFUND',
      'CustomerPayment',
      refund._id.toString(),
      { customerId: custId.toString(), amount, paymentMode: mode },
      session
    );

    return refund;
  });
};
