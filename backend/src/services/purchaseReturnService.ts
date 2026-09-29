import { Types } from 'mongoose';
import { PurchaseReturn, IPurchaseReturn } from '../models/PurchaseReturn';
import { Supplier } from '../models/Supplier';
import { Product } from '../models/Product';
import { adjustStock } from './inventoryService';
import { logAudit } from './auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { normalizeUnitQuantity } from '../utils/units';
import { calculateAmount, roundMoney } from '../utils/math';
import { getTodayDateString } from '../utils/date';
import { postJournalEntry, CHART_OF_ACCOUNTS } from './accountingService';

export interface PurchaseReturnItemInput {
  productId?: string;
  product_id?: string;
  quantity: number;
  unit: string;
  purchaseRate?: number;
  rate?: number;
}

export interface CreatePurchaseReturnParams {
  supplierId?: string;
  supplier_id?: string;
  purchaseId?: string;
  purchase_id?: string;
  returnDate?: string;
  return_date?: string;
  items: PurchaseReturnItemInput[];
  reason?: string;
  notes?: string;
}

export const createPurchaseReturn = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: CreatePurchaseReturnParams
): Promise<IPurchaseReturn> => {
  const bizId = new Types.ObjectId(businessId);
  const suppId = new Types.ObjectId(params.supplierId || params.supplier_id);
  const returnDate = params.returnDate || params.return_date || getTodayDateString();

  return await runInTransaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId }).session(session || null);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    if (!params.items || params.items.length === 0) {
      throw new AppError('Purchase return must contain at least one item.', 400);
    }

    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of params.items) {
      const prodId = new Types.ObjectId(item.productId || item.product_id);
      const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
      if (!product) {
        throw new AppError(`Product with id ${prodId} not found.`, 404);
      }

      const qty = Number(item.quantity);
      if (qty <= 0) {
        throw new AppError('Return quantity must be greater than 0.', 400);
      }

      const unit = (item.unit || product.defaultUnit).toUpperCase();
      const normalizedQty = normalizeUnitQuantity(qty, unit);
      const rate = Number(item.purchaseRate ?? item.rate ?? product.defaultRate);
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

      // Deduct product stock for returned goods
      await adjustStock(
        bizId,
        prodId,
        'RETURN',
        qty,
        unit,
        -normalizedQty, // negative: inventory reduced
        undefined,
        'Purchase Return',
        `Returned to supplier ${supplier.name}: ${params.reason || ''}`,
        userId,
        session
      );
    }

    const totalAmount = roundMoney(calculatedTotal);

    const returnDocs = await PurchaseReturn.create(
      [
        {
          businessId: bizId,
          supplierId: suppId,
          purchaseId: params.purchaseId || params.purchase_id ? new Types.ObjectId(params.purchaseId || params.purchase_id) : undefined,
          returnDate,
          items: processedItems,
          totalAmount,
          reason: params.reason || '',
          notes: params.notes || '',
          recordedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
      ],
      { session: session || undefined }
    );

    const purchaseReturn = returnDocs[0];

    // Reduce supplier current payable
    supplier.currentPayable = roundMoney((supplier.currentPayable || 0) - totalAmount);
    await supplier.save({ session: session || undefined });

    // Double-entry accounting: Debit Supplier Payable (reduces liability), Credit Inventory / Purchase Returns
    if (totalAmount > 0) {
      await postJournalEntry(
        {
          businessId: bizId,
          date: returnDate,
          sourceType: 'PURCHASE_RETURN',
          sourceId: purchaseReturn._id,
          narration: `Purchase return to ${supplier.name}: ${processedItems.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}${params.reason ? ` - ${params.reason}` : ''}`,
          lines: [
            {
              accountCode: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code,
              accountName: CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.name,
              accountType: 'LIABILITY',
              debit: totalAmount,
              credit: 0,
              partyType: 'SUPPLIER',
              partyId: suppId,
              partyName: supplier.name,
            },
            {
              accountCode: CHART_OF_ACCOUNTS.INVENTORY.code,
              accountName: CHART_OF_ACCOUNTS.INVENTORY.name,
              accountType: 'ASSET',
              debit: 0,
              credit: totalAmount,
            },
          ],
          userId,
        },
        session
      );
    }

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'PURCHASE_RETURN',
      'PurchaseReturn',
      purchaseReturn._id.toString(),
      {
        supplierId: suppId.toString(),
        totalAmount,
      },
      session
    );

    return purchaseReturn;
  });
};

export const getPurchaseReturns = async (
  businessId: string | Types.ObjectId,
  filters: { supplierId?: string; startDate?: string; endDate?: string } = {}
): Promise<IPurchaseReturn[]> => {
  const bizId = new Types.ObjectId(businessId);
  const query: any = { businessId: bizId };

  if (filters.supplierId) {
    query.supplierId = new Types.ObjectId(filters.supplierId);
  }

  if (filters.startDate || filters.endDate) {
    query.returnDate = {};
    if (filters.startDate) query.returnDate.$gte = filters.startDate;
    if (filters.endDate) query.returnDate.$lte = filters.endDate;
  }

  return await PurchaseReturn.find(query).sort({ returnDate: -1, createdAt: -1 });
};
