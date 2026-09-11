import { Response } from 'express';
import { AuthRequest } from '../types';
import { Customer } from '../models/Customer';
import { QRCode } from '../models/QRCode';
import { Delivery } from '../models/Delivery';
import { Product } from '../models/Product';
import { Purchase } from '../models/Purchase';
import { Supplier } from '../models/Supplier';
import { CustomerPayment } from '../models/CustomerPayment';
import { SupplierPayment } from '../models/SupplierPayment';
import { Expense } from '../models/Expense';
import { StockMovement } from '../models/StockMovement';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
};

const arrayToCsv = (headers: string[], rows: any[][]): string => {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvField).join(','));
  return [headerLine, ...rowLines].join('\n');
};

export const exportData = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const type = req.params.type;
  const bizId = new Types.ObjectId(req.user.business_id);
  let csvData = '';
  let filename = `milk_and_more_${type}_${new Date().toISOString().split('T')[0]}.csv`;

  switch (type) {
    case 'customers': {
      const customers = await Customer.find({ businessId: bizId }).sort({ name: 1 });
      const headers = [
        'ID',
        'Name',
        'Mobile',
        'Alternate Mobile',
        'Address',
        'Locality',
        'Status',
        'Delivery Schedule',
        'Assigned QR',
        'Opening Balance',
        'Customer Since',
      ];
      const rows = customers.map((c) => [
        c._id.toString(),
        c.name,
        c.mobile,
        c.alternateMobile || '',
        c.address,
        c.locality || '',
        c.status,
        c.deliverySchedule,
        c.assignedQr || '',
        c.openingBalance,
        c.customerSince?.toISOString().split('T')[0] || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'qr-codes': {
      const qrs = await QRCode.find({ businessId: bizId }).populate('assignedCustomerId', 'name mobile');
      const headers = ['QR Code', 'Status', 'Generated At', 'Assigned Customer', 'Assigned At'];
      const rows = qrs.map((q) => [
        q.qrCode,
        q.status,
        q.generatedAt?.toISOString() || '',
        (q.assignedCustomerId as any)?.name || '',
        q.assignedAt?.toISOString() || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'deliveries': {
      const deliveries = await Delivery.find({ businessId: bizId })
        .populate('customerId', 'name mobile')
        .sort({ deliveryDate: -1 });
      const headers = [
        'Delivery ID',
        'Date',
        'Shift',
        'Customer Name',
        'Customer Mobile',
        'Items Count',
        'Total Amount',
        'Status',
        'Is Additional',
        'Notes',
      ];
      const rows = deliveries.map((d) => [
        d._id.toString(),
        d.deliveryDate,
        d.shift,
        (d.customerId as any)?.name || '',
        (d.customerId as any)?.mobile || '',
        d.items.length,
        d.totalAmount,
        d.status,
        d.isAdditional ? 'YES' : 'NO',
        d.notes || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'products': {
      const products = await Product.find({ businessId: bizId });
      const headers = [
        'Product ID',
        'Name',
        'Category',
        'Default Unit',
        'Default Rate',
        'Current Stock',
        'Average Cost',
        'Active',
      ];
      const rows = products.map((p) => [
        p._id.toString(),
        p.name,
        p.category,
        p.defaultUnit,
        p.defaultRate,
        p.currentStock,
        p.averageCost,
        p.isActive ? 'YES' : 'NO',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'purchases': {
      const purchases = await Purchase.find({ businessId: bizId }).populate('supplierId', 'name');
      const headers = ['Purchase ID', 'Date', 'Supplier', 'Total Amount', 'Paid Amount', 'Payable Amount', 'Payment Mode'];
      const rows = purchases.map((p) => [
        p._id.toString(),
        p.purchaseDate,
        (p.supplierId as any)?.name || '',
        p.totalAmount,
        p.paidAmount,
        p.payableAmount,
        p.paymentMode,
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'suppliers': {
      const suppliers = await Supplier.find({ businessId: bizId });
      const headers = ['Supplier ID', 'Name', 'Mobile', 'Address', 'Opening Payable', 'Current Payable', 'Active'];
      const rows = suppliers.map((s) => [
        s._id.toString(),
        s.name,
        s.mobile,
        s.address || '',
        s.openingPayable,
        s.currentPayable,
        s.isActive ? 'YES' : 'NO',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'customer-payments':
    case 'payments': {
      const payments = await CustomerPayment.find({ businessId: bizId }).populate('customerId', 'name mobile');
      const headers = ['Payment ID', 'Date', 'Customer Name', 'Customer Mobile', 'Amount', 'Payment Mode', 'Reference'];
      const rows = payments.map((p) => [
        p._id.toString(),
        p.paymentDate,
        (p.customerId as any)?.name || '',
        (p.customerId as any)?.mobile || '',
        p.amount,
        p.paymentMode,
        p.referenceNumber || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'supplier-payments': {
      const payments = await SupplierPayment.find({ businessId: bizId }).populate('supplierId', 'name');
      const headers = ['Payment ID', 'Date', 'Supplier Name', 'Amount', 'Payment Mode', 'Reference'];
      const rows = payments.map((p) => [
        p._id.toString(),
        p.paymentDate,
        (p.supplierId as any)?.name || '',
        p.amount,
        p.paymentMode,
        p.referenceNumber || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'expenses': {
      const expenses = await Expense.find({ businessId: bizId });
      const headers = ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Mode'];
      const rows = expenses.map((e) => [
        e._id.toString(),
        e.expenseDate,
        e.category,
        e.description,
        e.amount,
        e.paymentMode,
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    case 'inventory-movements':
    case 'stock-movements': {
      const movements = await StockMovement.find({ businessId: bizId }).populate('productId', 'name defaultUnit');
      const headers = ['Movement ID', 'Date', 'Product', 'Type', 'Quantity', 'Unit', 'Previous Stock', 'New Stock', 'Reason'];
      const rows = movements.map((m) => [
        m._id.toString(),
        m.createdAt?.toISOString() || '',
        (m.productId as any)?.name || '',
        m.type,
        m.quantity,
        m.unit,
        m.previousStock,
        m.newStock,
        m.reason || '',
      ]);
      csvData = arrayToCsv(headers, rows);
      break;
    }

    default:
      throw new AppError(`Unknown export type "${type}".`, 400);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvData);
};
