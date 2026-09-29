import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  getProfitAndLoss,
  getBalanceSheet,
  getAccountBalances,
} from '../services/financialService';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { Expense } from '../models/Expense';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { getTodayDateString } from '../utils/date';
import { roundMoney } from '../utils/math';
import { Types } from 'mongoose';

export const getProfitAndLossHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const { startDate, endDate } = req.query;

  const pnl = await getProfitAndLoss(
    req.user.business_id,
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined
  );

  res.json({
    success: true,
    data: pnl,
  });
};

export const getBalanceSheetHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const { asOfDate } = req.query;

  const bs = await getBalanceSheet(req.user.business_id, asOfDate ? String(asOfDate) : undefined);

  res.json({
    success: true,
    data: bs,
  });
};

export const getAccountBalancesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const balances = await getAccountBalances(req.user.business_id);

  res.json({
    success: true,
    data: balances,
  });
};

export const getDailyReportHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const dateStr = (req.query.date as string) || getTodayDateString();
  const bizId = new Types.ObjectId(req.user.business_id);

  const [deliveries, payments, expenses, products] = await Promise.all([
    Delivery.find({ businessId: bizId, deliveryDate: dateStr, status: 'DELIVERED' }),
    CustomerPayment.find({ businessId: bizId, paymentDate: dateStr }),
    Expense.find({ businessId: bizId, expenseDate: dateStr }),
    Product.find({ businessId: bizId, isActive: true }),
  ]);

  const uniqueCustomers = new Set(deliveries.map((d) => d.customerId.toString()));
  const totalSales = roundMoney(deliveries.reduce((s, d) => s + (d.totalAmount || 0), 0));
  const totalCollections = roundMoney(payments.reduce((s, p) => s + (p.amount || 0), 0));
  const totalExpenses = roundMoney(expenses.reduce((s, e) => s + (e.amount || 0), 0));

  res.json({
    success: true,
    data: {
      date: dateStr,
      deliveredCustomers: uniqueCustomers.size,
      deliveryEntries: deliveries.length,
      morningDeliveries: deliveries.filter((d) => d.shift === 'MORNING').length,
      eveningDeliveries: deliveries.filter((d) => d.shift === 'EVENING').length,
      sales: totalSales,
      collections: totalCollections,
      expenses: totalExpenses,
      stockSummary: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        currentStock: p.currentStock,
        unit: p.defaultUnit,
      })),
    },
  });
};

export const getProductReportHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const bizId = new Types.ObjectId(req.user.business_id);

  const products = await Product.find({ businessId: bizId, isActive: true }).sort({ name: 1 });
  const deliveries = await Delivery.find({ businessId: bizId, status: 'DELIVERED' });

  const report = products.map((prod) => {
    let totalQtySold = 0;
    let totalRevenue = 0;

    for (const d of deliveries) {
      for (const item of d.items) {
        if (item.productId.toString() === prod._id.toString()) {
          totalQtySold += item.normalizedQty || item.quantity;
          totalRevenue += item.amount;
        }
      }
    }

    return {
      id: prod._id.toString(),
      name: prod.name,
      category: prod.category,
      unit: prod.defaultUnit,
      defaultRate: prod.defaultRate,
      currentStock: prod.currentStock,
      averageCost: prod.averageCost,
      inventoryValuation: roundMoney(prod.currentStock * (prod.averageCost || prod.defaultRate * 0.7)),
      totalSold: roundMoney(totalQtySold),
      totalRevenue: roundMoney(totalRevenue),
    };
  });

  res.json({
    success: true,
    data: report,
  });
};

export const getCustomerReportHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const bizId = new Types.ObjectId(req.user.business_id);
  const { status, includeInactive } = req.query;

  const customerFilter: any = { businessId: bizId, isDeleted: { $ne: true } };
  if (status && status !== 'ALL') {
    customerFilter.status = String(status).toUpperCase();
  } else if (!status && includeInactive !== 'true') {
    customerFilter.status = 'ACTIVE';
  }

  const customers = await Customer.find(customerFilter).sort({ name: 1 });
  const deliveries = await Delivery.find({ businessId: bizId, status: 'DELIVERED' }).sort({ deliveryDate: -1 });
  const payments = await CustomerPayment.find({ businessId: bizId }).sort({ paymentDate: -1 });

  const delMap = new Map<string, { count: number; total: number; lastDate?: string }>();
  for (const d of deliveries) {
    const cid = d.customerId.toString();
    const curr = delMap.get(cid) || { count: 0, total: 0 };
    curr.count += 1;
    curr.total += d.totalAmount || 0;
    if (!curr.lastDate && d.deliveryDate) {
      curr.lastDate = d.deliveryDate;
    }
    delMap.set(cid, curr);
  }

  const payMap = new Map<string, { total: number; lastDate?: string }>();
  for (const p of payments) {
    const cid = p.customerId.toString();
    const curr = payMap.get(cid) || { total: 0 };
    const amt = p.paymentType === 'REFUND' ? -(p.amount || 0) : (p.amount || 0);
    curr.total += amt;
    if (!curr.lastDate && p.paymentDate) {
      curr.lastDate = p.paymentDate;
    }
    payMap.set(cid, curr);
  }

  const report = customers.map((c) => {
    const cid = c._id.toString();
    const dData = delMap.get(cid) || { count: 0, total: 0 };
    const pData = payMap.get(cid) || { total: 0 };
    
    const isOpeningAdvance = c.openingBalanceType === 'ADVANCE';
    const opNet = isOpeningAdvance
      ? -roundMoney(c.openingBalance || 0)
      : roundMoney(c.openingBalance || 0);
    const netBalance = roundMoney(opNet + dData.total - pData.total);

    const currentOutstanding = Math.max(0, netBalance);
    const customerCredit = Math.max(0, -netBalance);
    const accountStatus =
      netBalance > 0 ? 'OUTSTANDING' : netBalance < 0 ? 'CUSTOMER_CREDIT' : 'SETTLED';

    let lastTransaction = '—';
    if (dData.lastDate && pData.lastDate) {
      lastTransaction = dData.lastDate >= pData.lastDate ? dData.lastDate : pData.lastDate;
    } else if (dData.lastDate) {
      lastTransaction = dData.lastDate;
    } else if (pData.lastDate) {
      lastTransaction = pData.lastDate;
    }

    return {
      id: cid,
      name: c.name,
      mobile: c.mobile,
      address: c.address || '',
      locality: c.locality || '',
      assignedQr: c.assignedQr,
      openingBalance: c.openingBalance,
      openingBalanceType: c.openingBalanceType || 'DUE',
      deliveryCount: dData.count,
      totalBilled: roundMoney(dData.total),
      totalPaid: roundMoney(pData.total),
      currentOutstanding,
      customerCredit,
      accountStatus,
      status: c.status || (c.serviceEndDate ? 'INACTIVE' : 'ACTIVE'),
      active: c.status === 'ACTIVE' && !c.serviceEndDate,
      customerSince: c.customerSince,
      serviceEndDate: c.serviceEndDate || null,
      lastTransaction,
    };
  });

  res.json({
    success: true,
    data: report,
  });
};
