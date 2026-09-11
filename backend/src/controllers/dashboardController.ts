import { Response } from 'express';
import { AuthRequest, DashboardMetrics } from '../types';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { Supplier } from '../models/Supplier';
import { Purchase } from '../models/Purchase';
import { Expense } from '../models/Expense';
import { Product } from '../models/Product';
import { getAccountBalances } from '../services/financialService';
import { getTodayDateString } from '../utils/date';
import { roundMoney } from '../utils/math';
import { Types } from 'mongoose';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) return;

  const bizId = new Types.ObjectId(req.user.business_id);
  const todayStr = getTodayDateString();

  // 1. Customers
  const totalCustomers = await Customer.countDocuments({ businessId: bizId, status: 'ACTIVE' });

  // 2. Deliveries Today
  const todayDeliveries = await Delivery.find({
    businessId: bizId,
    deliveryDate: todayStr,
    status: 'DELIVERED',
  });

  const deliveryEntries = todayDeliveries.length;

  // Unique delivered customers
  const uniqueDeliveredCustIds = new Set(todayDeliveries.map((d) => d.customerId.toString()));
  const deliveredCustomers = uniqueDeliveredCustIds.size;
  const remainingCustomers = Math.max(0, totalCustomers - deliveredCustomers);

  const morningDeliveries = todayDeliveries.filter((d) => d.shift === 'MORNING').length;
  const eveningDeliveries = todayDeliveries.filter((d) => d.shift === 'EVENING').length;

  const todaySales = roundMoney(
    todayDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
  );

  // 3. Customer Collections Today
  const todayPayments = await CustomerPayment.find({
    businessId: bizId,
    paymentDate: todayStr,
  });
  const todayCollection = roundMoney(
    todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  // 4. Purchases & Expenses Today
  const todayPurchasesDocs = await Purchase.find({
    businessId: bizId,
    purchaseDate: todayStr,
  });
  const todayPurchases = roundMoney(
    todayPurchasesDocs.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  );

  const todayExpenseDocs = await Expense.find({
    businessId: bizId,
    expenseDate: todayStr,
  });
  const todayExpenses = roundMoney(
    todayExpenseDocs.reduce((sum, e) => sum + (e.amount || 0), 0)
  );

  // 5. Total Customer Outstanding
  const allCustomers = await Customer.find({ businessId: bizId, status: 'ACTIVE' });
  const allDeliveries = await Delivery.find({ businessId: bizId, status: 'DELIVERED' });
  const allCustomerPayments = await CustomerPayment.find({ businessId: bizId });

  const totalDelCharge = allDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalCustomerPaid = allCustomerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCustomerOpening = allCustomers.reduce((sum, c) => sum + (c.openingBalance || 0), 0);

  const totalOutstanding = roundMoney(
    Math.max(0, totalCustomerOpening + totalDelCharge - totalCustomerPaid)
  );

  // 6. Supplier Payable
  const suppliers = await Supplier.find({ businessId: bizId, isActive: true });
  const supplierPayable = roundMoney(
    suppliers.reduce((sum, s) => sum + Math.max(0, s.currentPayable || 0), 0)
  );

  // 7. Cash, UPI, Bank Balances
  const accounts = await getAccountBalances(bizId);

  // 8. Low Stock Count
  const lowStockProducts = await Product.find({
    businessId: bizId,
    isActive: true,
    $expr: { $lte: ['$currentStock', '$minStockAlert'] },
  });
  const lowStockCount = lowStockProducts.length;

  const todayProfit = roundMoney(todaySales - todayPurchases - todayExpenses);

  const metrics: DashboardMetrics & {
    morningDeliveries: number;
    eveningDeliveries: number;
    todayDate: string;
  } = {
    totalCustomers,
    deliveredCustomers,
    remainingCustomers,
    deliveryProgress: `${deliveredCustomers}/${totalCustomers}`,
    deliveryEntries,
    morningDeliveries,
    eveningDeliveries,
    todaySales,
    todayCollection,
    totalOutstanding,
    supplierPayable,
    todayPurchases,
    todayExpenses,
    todayProfit,
    cashBalance: accounts.current_cash,
    upiBalance: accounts.current_upi,
    bankBalance: accounts.current_bank,
    lowStockCount,
    todayDate: todayStr,
  };

  res.json({
    success: true,
    data: metrics,
  });
};
