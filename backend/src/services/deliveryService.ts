import { Types } from 'mongoose';
import { Delivery, IDelivery, DeliveryShift } from '../models/Delivery';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { CustomerRate } from '../models/CustomerRate';
import { adjustStock } from './inventoryService';
import { logAudit } from './auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getTodayDateString } from '../utils/date';
import { normalizeUnitQuantity } from '../utils/units';
import { calculateAmount, roundMoney } from '../utils/math';
import { JournalEntry } from '../models/JournalEntry';
import { postJournalEntry, reverseJournalEntry, CHART_OF_ACCOUNTS } from './accountingService';

export interface DeliveryItemInput {
  productId?: string;
  product_id?: string;
  quantity: number;
  unit: string;
  rate?: number;
}

export interface CreateDeliveryParams {
  customerId?: string;
  customer_id?: string;
  deliveryDate?: string;
  delivery_date?: string;
  shift?: DeliveryShift;
  items: DeliveryItemInput[];
  notes?: string;
  isAdditional?: boolean;
  is_additional?: boolean;
  idempotencyKey?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const recordDelivery = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: CreateDeliveryParams
): Promise<IDelivery> => {
  const bizId = new Types.ObjectId(businessId);
  const custId = new Types.ObjectId(params.customerId || params.customer_id);
  const deliveryDate = params.deliveryDate || params.delivery_date || getTodayDateString();
  const shift: DeliveryShift = (params.shift || 'MORNING').toUpperCase() as DeliveryShift;

  const customer = await Customer.findOne({ _id: custId, businessId: bizId });
  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const isAdditional = Boolean(
    params.isAdditional ?? (params as any).is_additional ?? (params as any).forceAdditional ?? (params as any).force_additional
  );

  // Check duplicate delivery
  if (!isAdditional) {
    const existing = await Delivery.findOne({
      businessId: bizId,
      customerId: custId,
      deliveryDate,
      shift,
    });

    if (existing) {
      throw new AppError(
        `Today's delivery already recorded. This customer already has a delivery for ${shift} today.`,
        409
      );
    }
  }

  return await runInTransaction(async (session) => {
    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of params.items) {
      const prodId = new Types.ObjectId(item.productId || item.product_id);
      const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
      if (!product) {
        throw new AppError(`Product with id ${prodId} not found.`, 404);
      }

      // Check customer-specific rate override
      let finalRate = item.rate;
      if (finalRate === undefined || finalRate === null) {
        const custRate = await CustomerRate.findOne({
          businessId: bizId,
          customerId: custId,
          productId: prodId,
        }).session(session || null);

        if (custRate) {
          finalRate = custRate.customRate;
        } else {
          // Check customer.scheduledProducts customRate
          const scheduled = customer.scheduledProducts.find(
            (sp) => sp.productId.toString() === prodId.toString()
          );
          finalRate = scheduled?.customRate ?? product.defaultRate;
        }
      }

      const itemQty = Number(item.quantity);
      const unit = (item.unit || product.defaultUnit).toUpperCase();
      const normalizedQty = normalizeUnitQuantity(itemQty, unit);
      const itemAmount = calculateAmount(itemQty, finalRate);
      calculatedTotal += itemAmount;

      processedItems.push({
        productId: prodId,
        productName: product.name,
        quantity: itemQty,
        unit: unit as any,
        normalizedQty,
        rate: finalRate,
        amount: itemAmount,
      });

      // Deduct stock and write stock movement
      await adjustStock(
        bizId,
        prodId,
        'DELIVERY',
        itemQty,
        unit,
        -normalizedQty,
        undefined,
        'Delivery',
        `Delivery to ${customer.name}`,
        userId,
        session
      );
    }

    const deliveryDocs = await Delivery.create(
      [
        {
          businessId: bizId,
          customerId: custId,
          deliveryDate,
          shift,
          status: 'DELIVERED',
          items: processedItems,
          totalAmount: roundMoney(calculatedTotal),
          notes: params.notes || '',
          deliveredByUserId: userId ? new Types.ObjectId(userId) : undefined,
          deliveredAt: new Date(),
          location: params.location,
          isAdditional: isAdditional,
          idempotencyKey: params.idempotencyKey,
        },
      ],
      { session: session || undefined }
    );

    const delivery = deliveryDocs[0];

    // Double-entry accounting: Debit Customer Receivables, Credit Sales
    if (delivery.totalAmount > 0) {
      await postJournalEntry(
        {
          businessId: bizId,
          date: deliveryDate,
          sourceType: 'DELIVERY',
          sourceId: delivery._id,
          narration: `${shift} delivery to ${customer.name}${isAdditional ? ' (Extra Drop)' : ''}: ${processedItems.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}`,
          lines: [
            {
              accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
              accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
              accountType: 'ASSET',
              debit: delivery.totalAmount,
              credit: 0,
              partyType: 'CUSTOMER',
              partyId: custId,
              partyName: customer.name,
            },
            {
              accountCode: CHART_OF_ACCOUNTS.MILK_SALES.code,
              accountName: CHART_OF_ACCOUNTS.MILK_SALES.name,
              accountType: 'INCOME',
              debit: 0,
              credit: delivery.totalAmount,
              partyType: 'CUSTOMER',
              partyId: custId,
              partyName: customer.name,
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
      'MILKMAN',
      'CREATE_DELIVERY',
      'Delivery',
      delivery._id.toString(),
      {
        customerId: custId.toString(),
        totalAmount: delivery.totalAmount,
        shift,
        itemsCount: processedItems.length,
      },
      session
    );

    return delivery;
  });
};

export const updateDelivery = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  deliveryId: string | Types.ObjectId,
  params: Partial<CreateDeliveryParams>
): Promise<IDelivery> => {
  const bizId = new Types.ObjectId(businessId);
  const delId = new Types.ObjectId(deliveryId);

  return await runInTransaction(async (session) => {
    const delivery = await Delivery.findOne({ _id: delId, businessId: bizId }).session(session || null);
    if (!delivery) {
      throw new AppError('Delivery record not found.', 404);
    }

    // 1. Reverse all previous stock deductions
    for (const oldItem of delivery.items) {
      await adjustStock(
        bizId,
        oldItem.productId,
        'DELIVERY_REVERSAL',
        oldItem.quantity,
        oldItem.unit,
        oldItem.normalizedQty, // add back
        delId,
        'Delivery',
        `Reversal for edit of delivery ${delId}`,
        userId,
        session
      );
    }

    // 2. If new items provided, apply them
    if (params.items && params.items.length > 0) {
      let calculatedTotal = 0;
      const newProcessedItems = [];

      for (const item of params.items) {
        const prodId = new Types.ObjectId(item.productId || item.product_id);
        const product = await Product.findOne({ _id: prodId, businessId: bizId }).session(session || null);
        if (!product) {
          throw new AppError(`Product with id ${prodId} not found.`, 404);
        }

        const itemQty = Number(item.quantity);
        const unit = (item.unit || product.defaultUnit).toUpperCase();
        const normalizedQty = normalizeUnitQuantity(itemQty, unit);
        const rate = item.rate !== undefined ? Number(item.rate) : product.defaultRate;
        const itemAmount = calculateAmount(itemQty, rate);
        calculatedTotal += itemAmount;

        newProcessedItems.push({
          productId: prodId,
          productName: product.name,
          quantity: itemQty,
          unit: unit as any,
          normalizedQty,
          rate,
          amount: itemAmount,
        });

        // Deduct new stock
        await adjustStock(
          bizId,
          prodId,
          'DELIVERY',
          itemQty,
          unit,
          -normalizedQty,
          delId,
          'Delivery',
          `Edited delivery ${delId}`,
          userId,
          session
        );
      }

      delivery.items = newProcessedItems;
      delivery.totalAmount = roundMoney(calculatedTotal);
    }

    if (params.notes !== undefined) {
      delivery.notes = params.notes;
    }
    if (params.shift) {
      delivery.shift = params.shift;
    }
    if (params.deliveryDate || params.delivery_date) {
      delivery.deliveryDate = params.deliveryDate || params.delivery_date!;
    }

    await delivery.save({ session: session || undefined });

    // Reverse previous journal if exists
    const previousJournal = await JournalEntry.findOne({
      businessId: bizId,
      sourceType: 'DELIVERY',
      sourceId: delId,
      isReversed: false,
    }).session(session || null);

    if (previousJournal) {
      await reverseJournalEntry(bizId, previousJournal._id, 'Reversal for delivery update', userId, session);
    }

    // Post updated journal entry
    if (delivery.totalAmount > 0) {
      const customer = await Customer.findById(delivery.customerId).session(session || null);
      await postJournalEntry(
        {
          businessId: bizId,
          date: delivery.deliveryDate,
          sourceType: 'DELIVERY',
          sourceId: delivery._id,
          narration: `Updated ${delivery.shift} delivery to ${customer?.name || 'Customer'}: ${delivery.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}`,
          lines: [
            {
              accountCode: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code,
              accountName: CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.name,
              accountType: 'ASSET',
              debit: delivery.totalAmount,
              credit: 0,
              partyType: 'CUSTOMER',
              partyId: delivery.customerId,
              partyName: customer?.name,
            },
            {
              accountCode: CHART_OF_ACCOUNTS.MILK_SALES.code,
              accountName: CHART_OF_ACCOUNTS.MILK_SALES.name,
              accountType: 'INCOME',
              debit: 0,
              credit: delivery.totalAmount,
              partyType: 'CUSTOMER',
              partyId: delivery.customerId,
              partyName: customer?.name,
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
      'EDIT_DELIVERY',
      'Delivery',
      delivery._id.toString(),
      {
        totalAmount: delivery.totalAmount,
      },
      session
    );

    return delivery;
  });
};

export const deleteDelivery = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  deliveryId: string | Types.ObjectId
): Promise<void> => {
  const bizId = new Types.ObjectId(businessId);
  const delId = new Types.ObjectId(deliveryId);

  await runInTransaction(async (session) => {
    const delivery = await Delivery.findOne({ _id: delId, businessId: bizId }).session(session || null);
    if (!delivery) {
      throw new AppError('Delivery record not found.', 404);
    }

    // Reverse stock for all items
    for (const item of delivery.items) {
      await adjustStock(
        bizId,
        item.productId,
        'DELIVERY_REVERSAL',
        item.quantity,
        item.unit,
        item.normalizedQty, // add back
        delId,
        'Delivery',
        `Reversal on deletion of delivery ${delId}`,
        userId,
        session
      );
    }

    // Reverse journal entry
    const previousJournal = await JournalEntry.findOne({
      businessId: bizId,
      sourceType: 'DELIVERY',
      sourceId: delId,
      isReversed: false,
    }).session(session || null);

    if (previousJournal) {
      await reverseJournalEntry(bizId, previousJournal._id, 'Reversal on delivery deletion', userId, session);
    }

    await Delivery.deleteOne({ _id: delId, businessId: bizId }).session(session || null);

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'DELETE_DELIVERY',
      'Delivery',
      delId.toString(),
      {
        customerId: delivery.customerId.toString(),
        totalAmount: delivery.totalAmount,
      },
      session
    );
  });
};
