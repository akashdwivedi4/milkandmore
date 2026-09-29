import { Response } from 'express';
import { AuthRequest } from '../types';
import { Business } from '../models/Business';
import { Customer } from '../models/Customer';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { getCustomerLedger } from '../services/financialService';
import { roundMoney } from '../utils/math';
import { getTodayDateString } from '../utils/date';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export const getCustomerStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const { customerId, customer_id, startDate, endDate } = req.query;
  const cId = customerId || customer_id || req.params.id || req.params.customerId;

  if (!cId) {
    throw new AppError('customerId is required.', 400);
  }

  const bizId = new Types.ObjectId(req.user.business_id);
  const custId = new Types.ObjectId(String(cId));

  const [business, customer] = await Promise.all([
    Business.findById(bizId),
    Customer.findOne({ _id: custId, businessId: bizId }),
  ]);

  if (!business) {
    throw new AppError('Business not found.', 404);
  }
  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const sDate = startDate ? String(startDate) : undefined;
  const eDate = endDate ? String(endDate) : undefined;

  const ledger = await getCustomerLedger(bizId, custId, sDate, eDate);

  // Fetch individual deliveries and payments for itemized statement breakdown
  const deliveryFilter: any = { businessId: bizId, customerId: custId, status: 'DELIVERED' };
  const paymentFilter: any = { businessId: bizId, customerId: custId };

  if (sDate || eDate) {
    deliveryFilter.deliveryDate = {};
    paymentFilter.paymentDate = {};
    if (sDate) {
      deliveryFilter.deliveryDate.$gte = sDate;
      paymentFilter.paymentDate.$gte = sDate;
    }
    if (eDate) {
      deliveryFilter.deliveryDate.$lte = eDate;
      paymentFilter.paymentDate.$lte = eDate;
    }
  }

  const [periodDeliveries, periodPayments] = await Promise.all([
    Delivery.find(deliveryFilter).sort({ deliveryDate: 1, createdAt: 1 }),
    CustomerPayment.find(paymentFilter).sort({ paymentDate: 1, createdAt: 1 }),
  ]);

  // Expand delivery line items for itemized table
  const items = [];
  for (const d of periodDeliveries) {
    if (d.items && d.items.length > 0) {
      for (const it of d.items) {
        items.push({
          id: `${d._id.toString()}_${it.productId ? it.productId.toString() : Math.random().toString(36).substring(7)}`,
          deliveryId: d._id.toString(),
          date: d.deliveryDate,
          productName: it.productName || 'Milk',
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          amount: it.amount,
          shift: d.shift,
          isAdditional: Boolean(d.isAdditional),
        });
      }
    } else {
      // Fallback if delivery has no separate line items
      items.push({
        id: d._id.toString(),
        deliveryId: d._id.toString(),
        date: d.deliveryDate,
        productName: 'Daily Delivery',
        quantity: 1,
        unit: 'L',
        rate: d.totalAmount,
        amount: d.totalAmount,
        shift: d.shift,
        isAdditional: Boolean(d.isAdditional),
      });
    }
  }

  const payments = periodPayments.map((p) => ({
    id: p._id.toString(),
    paidAt: p.paymentDate,
    paymentDate: p.paymentDate,
    amount: p.amount,
    paymentMethod: p.paymentMode || 'CASH',
    notes: p.notes || null,
  }));

  const periodDeliveryAmount = roundMoney(
    periodDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
  );
  const periodPaymentsAmount = roundMoney(
    periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  // Compute today's drops (always based on today's calendar date)
  const todayStr = getTodayDateString();
  const todayDeliveries = await Delivery.find({
    businessId: bizId,
    customerId: custId,
    status: 'DELIVERED',
    deliveryDate: todayStr,
  });
  const todayDropsCount = todayDeliveries.length;
  const todayDeliveryAmount = roundMoney(
    todayDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0)
  );

  // Compute previous balance before cutoff date (sDate if date filter applied, otherwise todayStr)
  const cutoffDate = sDate || todayStr;
  const isOpeningAdvance = customer.openingBalanceType === 'ADVANCE';
  const opNet = isOpeningAdvance ? -roundMoney(customer.openingBalance || 0) : roundMoney(customer.openingBalance || 0);

  const priorDeliveries = await Delivery.find({
    businessId: bizId,
    customerId: custId,
    status: 'DELIVERED',
    deliveryDate: { $lt: cutoffDate },
  });
  const priorPayments = await CustomerPayment.find({
    businessId: bizId,
    customerId: custId,
    paymentDate: { $lt: cutoffDate },
  });
  const priorDelTotal = priorDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const priorPayTotal = priorPayments.reduce((sum, p) => sum + (p.paymentType === 'REFUND' ? -(p.amount || 0) : (p.amount || 0)), 0);
  const priorNet = roundMoney(opNet + priorDelTotal - priorPayTotal);
  const previousBalance = Math.max(0, priorNet);
  const previousCredit = Math.max(0, -priorNet);

  const periodLabel = sDate && eDate
    ? `${sDate} to ${eDate}`
    : sDate
    ? `From ${sDate}`
    : eDate
    ? `Up to ${eDate}`
    : 'All Time';

  const { customer: _ledgerCust, ...restLedger } = ledger;

  res.json({
    success: true,
    data: {
      ...restLedger,
      business: {
        id: business._id.toString(),
        name: business.name,
        ownerName: business.ownerName,
        phone: business.mobile || null,
        mobile: business.mobile || null,
        email: business.email || null,
        address: business.address || null,
        gstNumber: business.gstNumber || null,
        gstin: business.gstNumber || null,
        state: business.state || null,
        tagline: business.tagline || null,
        upiId: business.upiId || null,
        signature: business.signature || null,
        termsAndConditions: business.termsAndConditions || null,
        logo: business.logo || null,
        logoUrl: business.logo || null,
        currency: business.currency || 'INR',
      },
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address || null,
        openingBalance: customer.openingBalance || 0,
        openingBalanceType: customer.openingBalanceType || 'DUE',
        customerSince: customer.customerSince,
        serviceEndDate: customer.serviceEndDate || null,
        active: customer.status === 'ACTIVE',
        status: customer.status,
        assignedQr: customer.assignedQr || null,
        customerPortalToken: customer.customerPortalToken || null,
      },
      period: {
        startDate: sDate || null,
        endDate: eDate || null,
        label: periodLabel,
      },
      items,
      payments,
      deliveries: periodDeliveries.map((d) => ({
        id: d._id.toString(),
        date: d.deliveryDate,
        shift: d.shift,
        totalAmount: d.totalAmount,
        isAdditional: d.isAdditional,
        items: d.items,
      })),
      summary: {
        openingBalance: customer.openingBalance || 0,
        openingBalanceType: customer.openingBalanceType || 'DUE',
        previousBalance,
        previousCredit,
        todayDropsCount,
        todayDeliveryAmount,
        todayDrops: {
          count: todayDropsCount,
          amount: todayDeliveryAmount,
        },
        totalDeliveriesCount: periodDeliveries.length,
        periodDeliveryAmount,
        totalDeliveries: {
          count: periodDeliveries.length,
          amount: periodDeliveryAmount,
        },
        totalPaymentsCount: periodPayments.length,
        periodPaymentsAmount,
        finalOutstanding: ledger.currentOutstanding,
        customerCredit: ledger.customerCredit,
        accountStatus: ledger.accountStatus,
        amountDue: ledger.currentOutstanding,
        netPayable: ledger.currentOutstanding,
      },
      generatedAt: new Date().toISOString(),
    },
  });
};
