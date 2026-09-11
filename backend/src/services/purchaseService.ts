import { Types } from 'mongoose';
import { Purchase, IPurchase, PaymentMethod } from '../models/Purchase';
import { Supplier } from '../models/Supplier';
import { Product } from '../models/Product';
import { adjustStock, updateWeightedAverageCost } from './inventoryService';
import { updateAccountBalance } from './accountService';
import { logAudit } from './auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { normalizeUnitQuantity } from '../utils/units';
import { calculateAmount, roundMoney } from '../utils/math';
import { getTodayDateString } from '../utils/date';
import { JournalEntry } from '../models/JournalEntry';
import {
  postJournalEntry,
  reverseJournalEntry,
  CHART_OF_ACCOUNTS,
  getPaymentAccountByMode,
} from './accountingService';

export interface PurchaseItemInput {
  productId?: string;
  product_id?: string;
  quantity: number;
  unit: string;
  purchaseRate?: number;
  purchase_cost?: number;
  rate?: number;
}

export interface CreatePurchaseParams {
  supplierId?: string;
  supplier_id?: string;
  purchaseDate?: string;
  purchase_date?: string;
  purchased_at?: string;
  items?: PurchaseItemInput[];
  // Single-item shorthand support
  productId?: string;
  product_id?: string;
  quantity?: number;
  unit?: string;
  purchaseRate?: number;
  purchase_cost?: number;
  paidAmount?: number;
  paid_amount?: number;
  paymentMode?: PaymentMethod;
  payment_mode?: PaymentMethod;
  notes?: string;
  idempotencyKey?: string;
}

export const createPurchase = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: CreatePurchaseParams
): Promise<IPurchase> => {
  const bizId = new Types.ObjectId(businessId);
  const suppId = new Types.ObjectId(params.supplierId || params.supplier_id);
  const purchaseDate =
    params.purchaseDate || params.purchase_date || params.purchased_at || getTodayDateString();
  const paymentMode = (params.paymentMode || params.payment_mode || 'OTHER').toUpperCase() as PaymentMethod;

  return await runInTransaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId }).session(session || null);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    // Support both multi-item and single-item inputs
    let rawItems: PurchaseItemInput[] = [];
    if (params.items && params.items.length > 0) {
      rawItems = params.items;
    } else if (params.productId || params.product_id) {
      rawItems = [
        {
          productId: params.productId || params.product_id,
          quantity: params.quantity || 0,
          unit: params.unit || 'L',
          purchaseRate: params.purchaseRate ?? params.purchase_cost,
        },
      ];
    } else {
      throw new AppError('Purchase must contain at least one item.', 400);
    }

    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of rawItems) {
      const prodId = new Types.ObjectId(item.productId || item.product_id);
      const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
      if (!product) {
        throw new AppError(`Product with id ${prodId} not found.`, 404);
      }

      const qty = Number(item.quantity);
      const unit = (item.unit || product.defaultUnit).toUpperCase();
      const normalizedQty = normalizeUnitQuantity(qty, unit);
      const rate = Number(item.purchaseRate ?? item.purchase_cost ?? item.rate ?? product.defaultRate);
      const itemTotal = calculateAmount(qty, rate);
      calculatedTotal += itemTotal;

      processedItems.push({
        productId: prodId,
        productName: product.name,
        quantity: qty,
        unit,
        normalizedQty,
        purchaseRate: rate,
        total: itemTotal,
      });

      // Increase product stock and record stock movement
      await adjustStock(
        bizId,
        prodId,
        'PURCHASE',
        qty,
        unit,
        normalizedQty, // positive
        undefined,
        'Purchase',
        `Purchase from ${supplier.name}`,
        userId,
        session
      );

      // Recalculate Weighted Average Cost
      await updateWeightedAverageCost(bizId, prodId, normalizedQty, rate, session);
    }

    const totalAmount = roundMoney(calculatedTotal);
    const paidAmount = roundMoney(params.paidAmount ?? params.paid_amount ?? 0);
    const payableAmount = roundMoney(Math.max(0, totalAmount - paidAmount));

    const purchaseDocs = await Purchase.create(
      [
        {
          businessId: bizId,
          supplierId: suppId,
          purchaseDate,
          items: processedItems,
          totalAmount,
          paidAmount,
          payableAmount,
          paymentMode,
          notes: params.notes || '',
          idempotencyKey: params.idempotencyKey,
          recordedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ],
      { session: session || undefined }
    );

    const purchase = purchaseDocs[0];

    // Update supplier current payable
    supplier.currentPayable = roundMoney((supplier.currentPayable || 0) + payableAmount);
    await supplier.save({ session: session || undefined });

    // Deduct paid amount from account balance if paid via cash/upi/bank
    if (paidAmount > 0 && ['CASH', 'UPI', 'BANK'].includes(paymentMode)) {
      await updateAccountBalance(bizId, paymentMode, -paidAmount, session);
    }

    // Double-entry accounting: Debit Inventory, Credit Supplier Payable & Cash/Bank/UPI
    if (totalAmount > 0) {
      const journalLines: any[] = [
        {
          accountCode: CHART_OF_ACCOUNTS.INVENTORY.code,
          accountName: CHART_OF_ACCOUNTS.INVENTORY.name,
          accountType: 'ASSET',
          debit: totalAmount,
          credit: 0,
        },
      ];

      if (payableAmount > 0) {
        journalLines.push({
          accountCode: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code,
          accountName: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.name,
          accountType: 'LIABILITY',
          debit: 0,
          credit: payableAmount,
          partyType: 'SUPPLIER',
          partyId: suppId,
          partyName: supplier.name,
        });
      }

      if (paidAmount > 0) {
        const payAcc = getPaymentAccountByMode(paymentMode);
        journalLines.push({
          accountCode: payAcc.code,
          accountName: payAcc.name,
          accountType: 'ASSET',
          debit: 0,
          credit: paidAmount,
        });
      }

      await postJournalEntry(
        {
          businessId: bizId,
          date: purchaseDate,
          sourceType: 'PURCHASE',
          sourceId: purchase._id,
          narration: `Purchase from ${supplier.name}: ${processedItems.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}`,
          lines: journalLines,
          userId,
        },
        session
      );
    }

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'CREATE_PURCHASE',
      'Purchase',
      purchase._id.toString(),
      {
        supplierId: suppId.toString(),
        totalAmount,
        paidAmount,
        payableAmount,
      },
      session
    );

    return purchase;
  });
};

export const deletePurchase = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  purchaseId: string | Types.ObjectId
): Promise<void> => {
  const bizId = new Types.ObjectId(businessId);
  const purchId = new Types.ObjectId(purchaseId);

  await runInTransaction(async (session) => {
    const purchase = await Purchase.findOne({ _id: purchId, businessId: bizId }).session(session || null);
    if (!purchase) {
      throw new AppError('Purchase record not found.', 404);
    }

    // 1. Reverse stock for each item
    for (const item of purchase.items) {
      await adjustStock(
        bizId,
        item.productId,
        'PURCHASE_REVERSAL',
        item.quantity,
        item.unit,
        -item.normalizedQty, // deduct stock
        purchId,
        'Purchase',
        `Reversal on deletion of purchase ${purchId}`,
        userId,
        session
      );
    }

    // 2. Reverse supplier payable
    const supplier = await Supplier.findOne({ _id: purchase.supplierId, businessId: bizId }).session(
      session || null
    );
    if (supplier) {
      supplier.currentPayable = roundMoney(
        Math.max(0, (supplier.currentPayable || 0) - purchase.payableAmount)
      );
      await supplier.save({ session: session || undefined });
    }

    // 3. Refund paidAmount to account balance
    if (purchase.paidAmount > 0 && ['CASH', 'UPI', 'BANK'].includes(purchase.paymentMode)) {
      await updateAccountBalance(bizId, purchase.paymentMode, purchase.paidAmount, session);
    }

    // Reverse journal entry
    const previousJournal = await JournalEntry.findOne({
      businessId: bizId,
      sourceType: 'PURCHASE',
      sourceId: purchId,
      isReversed: false,
    }).session(session || null);

    if (previousJournal) {
      await reverseJournalEntry(bizId, previousJournal._id, 'Reversal on purchase deletion', userId, session);
    }

    await Purchase.deleteOne({ _id: purchId, businessId: bizId }).session(session || null);

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'DELETE_PURCHASE',
      'Purchase',
      purchId.toString(),
      {
        totalAmount: purchase.totalAmount,
      },
      session
    );
  });
};
