import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Download,
  FileSpreadsheet,
  Users,
  Truck,
  ShoppingBag,
  CreditCard,
  TrendingDown,
  Package,
  ShieldCheck,
} from 'lucide-react';

interface ExportItem {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const EXPORTS: ExportItem[] = [
  {
    type: 'customers',
    title: 'Customer Directory',
    description: 'Export all customer profiles, opening balances, dates, addresses, and QR tokens',
    icon: <Users className="w-6 h-6 text-sky-500" />,
  },
  {
    type: 'deliveries',
    title: 'Fulfilled Deliveries',
    description: 'Complete delivery logs with dates, quantities, products, custom rates, and totals',
    icon: <Truck className="w-6 h-6 text-indigo-500" />,
  },
  {
    type: 'purchases',
    title: 'Vendor Purchases',
    description: 'Purchase logs, raw milk suppliers, purchase rates, upfront payments, and balances',
    icon: <ShoppingBag className="w-6 h-6 text-emerald-500" />,
  },
  {
    type: 'suppliers',
    title: 'Suppliers & Vendors',
    description: 'Raw milk supplier contacts, opening balances, and current payables',
    icon: <Users className="w-6 h-6 text-amber-500" />,
  },
  {
    type: 'customer-payments',
    title: 'Customer Payment Collections',
    description: 'Customer payment receipts, payment methods (Cash, UPI, Bank), and notes',
    icon: <CreditCard className="w-6 h-6 text-teal-500" />,
  },
  {
    type: 'supplier-payments',
    title: 'Supplier Payouts',
    description: 'Vendor payment transactions, payment modes, and reference numbers',
    icon: <CreditCard className="w-6 h-6 text-rose-500" />,
  },
  {
    type: 'expenses',
    title: 'Business Expenses',
    description: 'Categorized business operating expenses, dates, descriptions, and modes',
    icon: <TrendingDown className="w-6 h-6 text-orange-500" />,
  },
  {
    type: 'inventory',
    title: 'Stock Inventory',
    description: 'Product list, units, current stock levels, and selling rates',
    icon: <Package className="w-6 h-6 text-purple-500" />,
  },
];

export const DataExport: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string) => {
    try {
      setDownloading(type);
      await api.downloadExport(type);
    } catch (err: any) {
      alert(err.message || `Failed to export ${type}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-sky-500" />
          Data Export & CSV Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Download clean, RFC 4180 compliant CSV files for backup, tax audit, or external spreadsheet analysis
        </p>
      </div>

      {/* Security notice */}
      <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-800">
          <p className="font-bold">Business Isolation & Data Privacy</p>
          <p className="mt-0.5">
            Exports strictly encompass only data belonging to your authenticated business. Passwords, auth secrets, and other tenant records are strictly excluded.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map((item) => (
          <div
            key={item.type}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 hover:border-sky-200 transition-colors"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-slate-50 rounded-xl">{item.icon}</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
            </div>

            <button
              onClick={() => handleDownload(item.type)}
              disabled={downloading === item.type}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading === item.type ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
