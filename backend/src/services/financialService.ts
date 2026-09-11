import { Types } from 'mongoose';
import { Business } from '../models/Business';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { Supplier } from '../models/Supplier';
import { Purchase } from '../models/Purchase';
import { SupplierPayment } from '../models/SupplierPayment';
import { Expense } from '../models/Expense';
import { Product } from '../models/Product';
import { FinancialAccount } from '../models/FinancialAccount';
import { roundMoney, safeAdd, safeSubtract } from '../utils/math';
import { getTodayDateString, getMonthRange } from '../utils/date';
import {
  AccountBalances,
  ProfitAndLossReport,
  BalanceSheetReport,
} from '../types';

export const getAccountBalances = async (
  businessId: string | Types.ObjectId
): Promise<AccountBalances> => {
  const bizId = new Types.ObjectId(businessId);
  const biz = await Business.findById(bizId);

  const openingCash = biz?.openingCash || 0;
  const openingUpi = biz?.openingUpi || 0;
  const openingBank = biz?.openingBank || 0;

  const accounts = await FinancialAccount.find({ businessId: bizId });
  const cashAcc = accounts.find((a) => a.accountType === 'CASH');
  const upiAcc = accounts.find((a) => a.accountType === 'UPI');
  const bankAcc = accounts.find((a) => a.accountType === 'BANK');

  const currentCash = roundMoney(openingCash + (cashAcc?.currentBalance || 0));
  const currentUpi = roundMoney(openingUpi + (upiAcc?.currentBalance || 0));
  const currentBank = roundMoney(openingBank + (bankAcc?.currentBalance || 0));

  return {
    opening_cash: openingCash,
    opening_upi: openingUpi,
    opening_bank: openingBank,
    current_cash: currentCash,
    current_upi: currentUpi,
    current_bank: currentBank,
    total_cash_upi_bank: roundMoney(currentCash + currentUpi + currentBank),
  };
};

export const getCustomerLedger = async (
  businessId: string | Types.ObjectId,
  customerId: string | Types.ObjectId,
  startDate?: string,
  endDate?: string
) => {
  const bizId = new Types.ObjectId(businessId);
  const custId = new Types.ObjectId(customerId);

  const customer = await Customer.findOne({ _id: custId, businessId: bizId });
  if (!customer) {
    throw new Error('Customer not found');
  }

  const deliveryFilter: any = { businessId: bizId, customerId: custId };
  const paymentFilter: any = { businessId: bizId, customerId: custId };

  if (startDate || endDate) {
    deliveryFilter.deliveryDate = {};
    paymentFilter.paymentDate = {};
    if (startDate) {
      deliveryFilter.deliveryDate.$gte = startDate;
      paymentFilter.paymentDate.$gte = startDate;
    }
    if (endDate) {
      deliveryFilter.deliveryDate.$lte = endDate;
      paymentFilter.paymentDate.$lte = endDate;
    }
  }

  const deliveries = await Delivery.find(deliveryFilter).sort({ deliveryDate: 1, createdAt: 1 });
  const payments = await CustomerPayment.find(paymentFilter).sort({ paymentDate: 1, createdAt: 1 });

  // Compute all-time totals for accurate outstanding balance
  const allDeliveries = await Delivery.find({ businessId: bizId, customerId: custId });
  const allPayments = await CustomerPayment.find({ businessId: bizId, customerId: custId });

  const totalDeliveryCharges = roundMoney(
    allDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
  );
  const totalCustomerPayments = roundMoney(
    allPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  const currentOutstanding = roundMoney(
    customer.openingBalance + totalDeliveryCharges - totalCustomerPayments
  );

  // Build combined chronological statement
  const entries: any[] = [];

  for (const d of deliveries) {
    entries.push({
      date: d.deliveryDate,
      type: 'DELIVERY',
      description: `${d.shift} delivery: ${d.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}`,
      debit: d.totalAmount,
      credit: 0,
      createdAt: d.createdAt,
      refId: d._id.toString(),
    });
  }

  for (const p of payments) {
    entries.push({
      date: p.paymentDate,
      type: 'PAYMENT',
      description: `Payment received (${p.paymentMode}${p.referenceNumber ? ` ref: ${p.referenceNumber}` : ''})`,
      debit: 0,
      credit: p.amount,
      createdAt: p.createdAt,
      refId: p._id.toString(),
    });
  }

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Calculate running balances
  let runningBalance = customer.openingBalance;
  for (const entry of entries) {
    runningBalance = roundMoney(runningBalance + entry.debit - entry.credit);
    entry.balance = runningBalance;
  }

  return {
    customer: {
      id: customer._id.toString(),
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address,
      openingBalance: customer.openingBalance,
      customerSince: customer.customerSince,
    },
    openingBalance: customer.openingBalance,
    totalDeliveryCharges,
    totalCustomerPayments,
    currentOutstanding,
    entries,
  };
};

export const getSupplierLedger = async (
  businessId: string | Types.ObjectId,
  supplierId: string | Types.ObjectId
) => {
  const bizId = new Types.ObjectId(businessId);
  const suppId = new Types.ObjectId(supplierId);

  const supplier = await Supplier.findOne({ _id: suppId, businessId: bizId });
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  const purchases = await Purchase.find({ businessId: bizId, supplierId: suppId }).sort({
    purchaseDate: 1,
    createdAt: 1,
  });
  const payments = await SupplierPayment.find({ businessId: bizId, supplierId: suppId }).sort({
    paymentDate: 1,
    createdAt: 1,
  });

  const totalPurchases = roundMoney(purchases.reduce((s, p) => s + (p.totalAmount || 0), 0));
  const totalPaid = roundMoney(
    payments.reduce((s, p) => s + (p.amount || 0), 0) +
      purchases.reduce((s, p) => s + (p.paidAmount || 0), 0)
  );

  const currentPayable = roundMoney(
    supplier.openingPayable +
      purchases.reduce((s, p) => s + (p.payableAmount || 0), 0) -
      payments.reduce((s, p) => s + (p.amount || 0), 0)
  );

  return {
    supplier: {
      id: supplier._id.toString(),
      name: supplier.name,
      mobile: supplier.mobile,
      openingPayable: supplier.openingPayable,
      currentPayable: supplier.currentPayable,
    },
    openingPayable: supplier.openingPayable,
    totalPurchases,
    totalPaid,
    currentPayable,
    purchases,
    payments,
  };
};

export const getProfitAndLoss = async (
  businessId: string | Types.ObjectId,
  startDate?: string,
  endDate?: string
): Promise<ProfitAndLossReport> => {
  const bizId = new Types.ObjectId(businessId);
  const today = getTodayDateString();
  const range = getMonthRange(new Date().getFullYear(), new Date().getMonth() + 1);

  const start = startDate || range.startDate;
  const end = endDate || today;

  // 1. Deliveries (Revenue)
  const deliveries = await Delivery.find({
    businessId: bizId,
    deliveryDate: { $gte: start, $lte: end },
    status: { $in: ['DELIVERED'] },
  });

  const revenue = roundMoney(deliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0));

  // 2. Cost of Goods Sold (COGS) based on inventory Weighted Average Cost
  const products = await Product.find({ businessId: bizId });
  const productCostMap = new Map<string, number>();
  for (const p of products) {
    productCostMap.set(p._id.toString(), p.averageCost || p.defaultRate * 0.7);
  }

  let cogs = 0;
  for (const d of deliveries) {
    for (const item of d.items) {
      const avgCost = productCostMap.get(item.productId.toString()) || 0;
      cogs += (item.normalizedQty || item.quantity) * avgCost;
    }
  }
  cogs = roundMoney(cogs);

  const grossProfit = roundMoney(revenue - cogs);

  // 3. Expenses
  const expenses = await Expense.find({
    businessId: bizId,
    expenseDate: { $gte: start, $lte: end },
  });

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;

  for (const e of expenses) {
    expensesByCategory[e.category] = roundMoney(
      (expensesByCategory[e.category] || 0) + e.amount
    );
    totalExpenses += e.amount;
  }
  totalExpenses = roundMoney(totalExpenses);

  const netProfit = roundMoney(grossProfit - totalExpenses);

  return {
    period: { start_date: start, end_date: end },
    revenue,
    cogs,
    gross_profit: grossProfit,
    expenses: totalExpenses,
    expenses_by_category: expensesByCategory,
    net_profit: netProfit,
  };
};

export const getBalanceSheet = async (
  businessId: string | Types.ObjectId,
  asOfDate?: string
): Promise<BalanceSheetReport> => {
  const bizId = new Types.ObjectId(businessId);
  const targetDate = asOfDate || getTodayDateString();

  // 1. Cash, UPI, Bank
  const accounts = await getAccountBalances(bizId);

  // 2. Customer Receivables (Total Outstanding)
  const customers = await Customer.find({ businessId: bizId, status: 'ACTIVE' });
  let customerReceivables = 0;

  for (const cust of customers) {
    const dels = await Delivery.find({
      businessId: bizId,
      customerId: cust._id,
      deliveryDate: { $lte: targetDate },
      status: 'DELIVERED',
    });
    const pays = await CustomerPayment.find({
      businessId: bizId,
      customerId: cust._id,
      paymentDate: { $lte: targetDate },
    });

    const totD = dels.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const totP = pays.reduce((s, p) => s + (p.amount || 0), 0);
    const custOut = cust.openingBalance + totD - totP;
    if (custOut > 0) {
      customerReceivables += custOut;
    }
  }
  customerReceivables = roundMoney(customerReceivables);

  // 3. Inventory Valuation (Stock * Average Cost)
  const products = await Product.find({ businessId: bizId, isActive: true });
  let inventoryValue = 0;
  for (const p of products) {
    if (p.currentStock > 0) {
      const unitCost = p.averageCost || p.defaultRate * 0.7;
      inventoryValue += p.currentStock * unitCost;
    }
  }
  inventoryValue = roundMoney(inventoryValue);

  const totalAssets = roundMoney(
    accounts.current_cash +
      accounts.current_upi +
      accounts.current_bank +
      customerReceivables +
      inventoryValue
  );

  // 4. Supplier Payables
  const suppliers = await Supplier.find({ businessId: bizId, isActive: true });
  const supplierPayables = roundMoney(
    suppliers.reduce((s, sup) => s + Math.max(0, sup.currentPayable || 0), 0)
  );

  const totalLiabilities = supplierPayables;
  const netPosition = roundMoney(totalAssets - totalLiabilities);

  return {
    as_of_date: targetDate,
    assets: {
      cash: accounts.current_cash,
      upi: accounts.current_upi,
      bank: accounts.current_bank,
      customer_receivables: customerReceivables,
      inventory_value: inventoryValue,
      total_assets: totalAssets,
    },
    liabilities: {
      supplier_payables: supplierPayables,
      other_liabilities: 0,
      total_liabilities: totalLiabilities,
    },
    net_position: netPosition,
  };
};
