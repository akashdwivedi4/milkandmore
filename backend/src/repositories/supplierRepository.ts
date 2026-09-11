import { Types } from 'mongoose';
import { Supplier } from '../models/Supplier';
import { Purchase } from '../models/Purchase';
import { SupplierPayment } from '../models/SupplierPayment';
import { safeAdd, safeSubtract, roundMoney } from '../utils/math';

export interface SupplierFilters {
  active?: boolean;
  search?: string;
}

export interface SupplierLedgerEntry {
  date: string;
  type: 'OPENING' | 'PURCHASE' | 'PAYMENT';
  reference?: string;
  details: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface SupplierLedgerResult {
  supplier?: any;
  openingPayable?: number;
  opening_payable: number;
  totalPurchases?: number;
  total_purchases: number;
  totalPayments?: number;
  totalPaid?: number;
  total_payments: number;
  currentPayable?: number;
  current_payable: number;
  purchases?: any[];
  payments?: any[];
  transactions: SupplierLedgerEntry[];
}

export class SupplierRepository {
  async getAll(
    businessId: string | Types.ObjectId,
    filters: SupplierFilters = {}
  ): Promise<any[]> {
    const bizId = new Types.ObjectId(businessId);
    const query: any = { businessId: bizId };

    if (filters.active !== undefined) {
      query.isActive = filters.active;
    }

    if (filters.search) {
      const q = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ name: q }, { mobile: q }];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    return Promise.all(
      suppliers.map(async (supplier) => {
        const ledger = await this.getLedger(bizId, supplier._id);
        return {
          id: supplier._id.toString(),
          _id: supplier._id,
          business_id: supplier.businessId.toString(),
          businessId: supplier.businessId,
          name: supplier.name,
          mobile: supplier.mobile,
          address: supplier.address || null,
          notes: supplier.notes || null,
          opening_payable: supplier.openingPayable,
          openingPayable: supplier.openingPayable,
          is_active: supplier.isActive,
          isActive: supplier.isActive,
          total_purchases: ledger.total_purchases,
          total_payments: ledger.total_payments,
          current_payable: ledger.current_payable,
          currentPayable: ledger.current_payable,
          created_at: supplier.createdAt.toISOString(),
          updated_at: supplier.updatedAt.toISOString(),
          summary: {
            totalPurchases: ledger.total_purchases,
            totalPayments: ledger.total_payments,
            currentPayable: ledger.current_payable,
          },
        };
      })
    );
  }

  async getById(
    businessId: string | Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<any | null> {
    const bizId = new Types.ObjectId(businessId);
    let suppId: Types.ObjectId;
    try {
      suppId = new Types.ObjectId(id);
    } catch {
      return null;
    }

    const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId });
    if (!supplier) return null;

    const ledger = await this.getLedger(bizId, supplier._id);

    return {
      id: supplier._id.toString(),
      _id: supplier._id,
      business_id: supplier.businessId.toString(),
      businessId: supplier.businessId,
      name: supplier.name,
      mobile: supplier.mobile,
      address: supplier.address || null,
      notes: supplier.notes || null,
      opening_payable: supplier.openingPayable,
      openingPayable: supplier.openingPayable,
      is_active: supplier.isActive,
      isActive: supplier.isActive,
      total_purchases: ledger.total_purchases,
      total_payments: ledger.total_payments,
      current_payable: ledger.current_payable,
      currentPayable: ledger.current_payable,
      created_at: supplier.createdAt.toISOString(),
      updated_at: supplier.updatedAt.toISOString(),
      summary: {
        totalPurchases: ledger.total_purchases,
        totalPayments: ledger.total_payments,
        currentPayable: ledger.current_payable,
      },
    };
  }

  async create(businessId: string | Types.ObjectId, data: any): Promise<any> {
    const bizId = new Types.ObjectId(businessId);
    const openingPayable = Number(data.opening_payable ?? data.openingPayable ?? 0);

    const supplier = await Supplier.create({
      businessId: bizId,
      name: (data.name || '').trim(),
      mobile: (data.mobile || '').trim(),
      address: (data.address || '').trim(),
      notes: (data.notes || '').trim(),
      openingPayable,
      currentPayable: openingPayable,
      isActive: true,
    });

    return {
      id: supplier._id.toString(),
      _id: supplier._id,
      business_id: supplier.businessId.toString(),
      businessId: supplier.businessId,
      name: supplier.name,
      mobile: supplier.mobile,
      address: supplier.address || null,
      notes: supplier.notes || null,
      opening_payable: supplier.openingPayable,
      openingPayable: supplier.openingPayable,
      current_payable: supplier.currentPayable,
      currentPayable: supplier.currentPayable,
      is_active: supplier.isActive,
      isActive: supplier.isActive,
      total_purchases: 0,
      total_payments: 0,
      created_at: supplier.createdAt.toISOString(),
      updated_at: supplier.updatedAt.toISOString(),
    };
  }

  async update(
    businessId: string | Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<any | null> {
    const bizId = new Types.ObjectId(businessId);
    let suppId: Types.ObjectId;
    try {
      suppId = new Types.ObjectId(id);
    } catch {
      return null;
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.mobile !== undefined) updates.mobile = data.mobile.trim();
    if (data.address !== undefined) updates.address = data.address.trim();
    if (data.notes !== undefined) updates.notes = data.notes.trim();
    if (data.is_active !== undefined) updates.isActive = Boolean(data.is_active);
    if (data.isActive !== undefined) updates.isActive = Boolean(data.isActive);

    const supplier = await Supplier.findOneAndUpdate(
      { _id: suppId, businessId: bizId },
      { $set: updates },
      { new: true }
    );

    if (!supplier) return null;

    const ledger = await this.getLedger(bizId, supplier._id);

    return {
      id: supplier._id.toString(),
      _id: supplier._id,
      business_id: supplier.businessId.toString(),
      businessId: supplier.businessId,
      name: supplier.name,
      mobile: supplier.mobile,
      address: supplier.address || null,
      notes: supplier.notes || null,
      opening_payable: supplier.openingPayable,
      openingPayable: supplier.openingPayable,
      is_active: supplier.isActive,
      isActive: supplier.isActive,
      current_payable: ledger.current_payable,
      currentPayable: ledger.current_payable,
      total_purchases: ledger.total_purchases,
      total_payments: ledger.total_payments,
      created_at: supplier.createdAt.toISOString(),
      updated_at: supplier.updatedAt.toISOString(),
    };
  }

  async delete(
    businessId: string | Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<boolean> {
    const bizId = new Types.ObjectId(businessId);
    let suppId: Types.ObjectId;
    try {
      suppId = new Types.ObjectId(id);
    } catch {
      return false;
    }

    const res = await Supplier.updateOne(
      { _id: suppId, businessId: bizId },
      { $set: { isActive: false } }
    );
    return res.matchedCount > 0;
  }

  async getLedger(
    businessId: string | Types.ObjectId,
    supplierId: string | Types.ObjectId
  ): Promise<SupplierLedgerResult> {
    const bizId = new Types.ObjectId(businessId);
    let suppId: Types.ObjectId;
    try {
      suppId = new Types.ObjectId(supplierId);
    } catch {
      return {
        opening_payable: 0,
        total_purchases: 0,
        total_payments: 0,
        current_payable: 0,
        transactions: [],
      };
    }

    const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId });
    const opening_payable = supplier?.openingPayable || 0;

    const purchases = await Purchase.find({ businessId: bizId, supplierId: suppId }).sort({
      purchaseDate: 1,
      createdAt: 1,
    });
    const payments = await SupplierPayment.find({ businessId: bizId, supplierId: suppId }).sort({
      paymentDate: 1,
      createdAt: 1,
    });

    const total_purchases = roundMoney(
      purchases.reduce((acc, p) => safeAdd(acc, p.totalAmount || 0), 0)
    );
    const upfront_payments = roundMoney(
      purchases.reduce((acc, p) => safeAdd(acc, p.paidAmount || 0), 0)
    );
    const direct_payments = roundMoney(
      payments.reduce((acc, p) => safeAdd(acc, p.amount || 0), 0)
    );
    const total_payments = safeAdd(upfront_payments, direct_payments);
    const current_payable = safeSubtract(safeAdd(opening_payable, total_purchases), total_payments);

    const txs: SupplierLedgerEntry[] = [];
    let running = opening_payable;

    txs.push({
      date: supplier?.createdAt
        ? supplier.createdAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      type: 'OPENING',
      reference: 'BAL-START',
      details: 'Opening Balance Payable',
      debit: 0,
      credit: opening_payable,
      running_balance: running,
    });

    const combined: Array<{
      date: string;
      createdAt: Date;
      type: 'PURCHASE' | 'PAYMENT';
      amount: number;
      paid: number;
      ref: string;
      details: string;
    }> = [
      ...purchases.map((p) => ({
        date: p.purchaseDate || p.createdAt.toISOString().split('T')[0],
        createdAt: p.createdAt,
        type: 'PURCHASE' as const,
        amount: p.totalAmount,
        paid: p.paidAmount || 0,
        ref: p._id.toString().substring(0, 8),
        details: p.items?.length
          ? `Purchase: ${p.items.map((it) => `${it.productName || 'Milk'} (${it.quantity} ${it.unit} @ ₹${it.purchaseRate})`).join(', ')}`
          : 'Raw Milk Purchase',
      })),
      ...payments.map((sp) => ({
        date: sp.paymentDate || sp.createdAt.toISOString().split('T')[0],
        createdAt: sp.createdAt,
        type: 'PAYMENT' as const,
        amount: sp.amount,
        paid: sp.amount,
        ref: sp.referenceNumber || sp._id.toString().substring(0, 8),
        details: `Payment via ${sp.paymentMode}`,
      })),
    ];

    combined.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const item of combined) {
      if (item.type === 'PURCHASE') {
        running = safeAdd(running, item.amount);
        txs.push({
          date: item.date,
          type: 'PURCHASE',
          reference: item.ref,
          details: item.details,
          debit: 0,
          credit: item.amount,
          running_balance: running,
        });

        if (item.paid > 0) {
          running = safeSubtract(running, item.paid);
          txs.push({
            date: item.date,
            type: 'PAYMENT',
            reference: `${item.ref}-PAID`,
            details: 'Upfront payment on purchase',
            debit: item.paid,
            credit: 0,
            running_balance: running,
          });
        }
      } else {
        running = safeSubtract(running, item.amount);
        txs.push({
          date: item.date,
          type: 'PAYMENT',
          reference: item.ref,
          details: item.details,
          debit: item.amount,
          credit: 0,
          running_balance: running,
        });
      }
    }

    return {
      supplier: {
        id: supplier?._id.toString(),
        name: supplier?.name,
        mobile: supplier?.mobile,
        openingPayable: opening_payable,
        opening_payable,
        currentPayable: current_payable,
        current_payable,
      },
      openingPayable: opening_payable,
      opening_payable,
      totalPurchases: total_purchases,
      total_purchases,
      totalPayments: total_payments,
      total_payments,
      totalPaid: total_payments,
      currentPayable: current_payable,
      current_payable,
      purchases,
      payments,
      transactions: txs,
    };
  }
}

export const supplierRepository = new SupplierRepository();
