import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardMetrics } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  IndianRupee,
  QrCode,
  UserPlus,
  Truck,
  ArrowRight,
  Package,
  Calendar,
  Wallet,
  TrendingDown,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';
import { AddCustomerModal } from '../components/AddCustomerModal';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [metricRes, delivRes] = await Promise.all([
        api.getDashboardMetrics(),
        api.getDeliveries({ limit: 5 }),
      ]);

      if (metricRes.success) setMetrics(metricRes.data);
      if (delivRes.success) setRecentDeliveries(delivRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-5">
      {/* Top Banner / iRujul Dairy Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#6B1724] via-[#52121b] to-[#2E7D32] p-4 sm:p-5 rounded-2xl text-white shadow-lg shadow-maroon-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
              Live Dairy Operations
            </span>
            <span className="text-xs text-maroon-100 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-200" />
              {formatDate(new Date().toISOString())}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
            Milk & More Management Hub
          </h2>
          <p className="text-xs text-maroon-100/90 max-w-lg">
            Daily door-to-door milk drops, customer account ledgers, instant collection receipts, and live inventory.
          </p>
        </div>

        {/* Primary CTAs: Scan & Customer Accounts */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/accounts')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-slate-900" />
            <span>Customer Accounts</span>
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-[#6B1724] font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#6B1724]" />
            <span>Scan QR</span>
          </button>
        </div>
      </div>

      {/* Low stock notification */}
      {metrics && (metrics.lowStockCount || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-800 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Low Stock Warning:</strong> {metrics.lowStockCount} product(s) have reached low stock threshold.
            </span>
          </div>
          <button
            onClick={() => navigate('/inventory')}
            className="px-3 py-1 bg-white border border-amber-200 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100"
          >
            Check Stock →
          </button>
        </div>
      )}

      {/* Primary Delivery Metrics (Unique Customers vs Total Entries) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Customers
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
              {metrics ? metrics.totalCustomers : '-'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Subscribed Route</span>
          </div>
        </div>

        {/* Delivered Customers (UNIQUE) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 to-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Delivered Customers
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 leading-none">
              {metrics ? metrics.deliveredCustomers : '-'}
            </span>
            <span className="text-xs font-semibold text-emerald-800 block mt-1">
              {metrics ? `${metrics.deliveredCustomers} Unique Customers` : '-'}
            </span>
          </div>
        </div>

        {/* Total Delivery Entries (ALL LOGS) */}
        <div className="bg-white p-4 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/40 to-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Delivery Entries
            </span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-sky-800 leading-none">
              {metrics ? metrics.deliveryEntries : '-'}
            </span>
            <span className="text-xs text-sky-600 block mt-1">Total Delivery Records</span>
          </div>
        </div>

        {/* Remaining Customers */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Remaining
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-amber-800 leading-none">
              {metrics ? metrics.remainingCustomers : '-'}
            </span>
            <span className="text-xs text-amber-700/80 block mt-1">Pending Drops Today</span>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Today's Sales
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {metrics ? formatCurrency(metrics.todaySales) : '-'}
          </div>
          <span className="text-[11px] text-slate-400">Total delivery value</span>
        </div>

        {/* Today's Collection */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Today's Collection
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {metrics ? formatCurrency(metrics.todayCollection) : '-'}
          </div>
          <span className="text-[11px] text-slate-400">Customer receipts</span>
        </div>

        {/* Customer Outstanding */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/30 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
            Customer Outstanding
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-800 mt-1">
            {metrics ? formatCurrency(metrics.totalOutstanding) : '-'}
          </div>
          <span className="text-[11px] text-rose-600">Total customer receivables</span>
        </div>

        {/* Supplier Payable */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
            Supplier Payable
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-800 mt-1">
            {metrics ? formatCurrency(metrics.supplierPayable || 0) : '-'}
          </div>
          <span className="text-[11px] text-amber-600">Total vendor payables</span>
        </div>
      </div>

      {/* Payment Accounts: Cash, UPI, Bank */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-sky-500" />
            Liquid Account Balances
          </h3>
          <button
            onClick={() => navigate('/financials')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700"
          >
            Financial Position →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">Cash in Hand</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {metrics ? formatCurrency(metrics.cashBalance || 0) : '₹0.00'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">UPI Balance</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {metrics ? formatCurrency(metrics.upiBalance || 0) : '₹0.00'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
              UPI
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">Bank Balance</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {metrics ? formatCurrency(metrics.bankBalance || 0) : '₹0.00'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              A/C
            </div>
          </div>
        </div>
      </div>

      {/* Fast Action Shortcuts */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Fast Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/accounts')}
            className="p-3 bg-white hover:bg-amber-50/50 border border-amber-200/80 rounded-xl text-left transition-all shadow-xs"
          >
            <Calculator className="w-5 h-5 text-amber-600 mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Customer Accounts</span>
            <span className="text-[10px] text-slate-400">Statement & Dues</span>
          </button>

          <button
            onClick={() => navigate('/today')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs"
          >
            <Clock className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Daily Delivery</span>
            <span className="text-[10px] text-slate-400">Route & Drops</span>
          </button>

          <button
            onClick={() => navigate('/payments')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs"
          >
            <Receipt className="w-5 h-5 text-sky-600 mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Payments</span>
            <span className="text-[10px] text-slate-400">Log Cash / UPI</span>
          </button>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs"
          >
            <UserPlus className="w-5 h-5 text-[#6B1724] mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Add Customer</span>
            <span className="text-[10px] text-slate-400">New Subscriber</span>
          </button>

          <button
            onClick={() => navigate('/scan')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs"
          >
            <QrCode className="w-5 h-5 text-indigo-600 mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Scan Door QR</span>
            <span className="text-[10px] text-slate-400">Quick Drop</span>
          </button>

          <button
            onClick={() => navigate('/financials')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs"
          >
            <Scale className="w-5 h-5 text-purple-600 mb-1" />
            <span className="text-xs font-bold text-slate-900 block">Dairy Day Book</span>
            <span className="text-[10px] text-slate-400">P&L & Balance</span>
          </button>
        </div>
      </div>

      {/* Recent Deliveries Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Delivery Records</h3>
          </div>
          <button
            onClick={() => navigate('/today')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentDeliveries.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">No deliveries recorded today yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Scan a customer QR code to record the first delivery.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDeliveries.map((deliv) => (
              <div
                key={deliv.id}
                onClick={() => navigate(`/customers/${deliv.customer_id}`)}
                className="p-3.5 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                    {deliv.customer?.name ? deliv.customer.name[0] : 'C'}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {deliv.customer?.name || 'Customer'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {deliv.items?.map((it: any) => `${it.quantity} ${it.unit} ${it.product?.name || ''}`).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block">
                    {formatCurrency(deliv.total_amount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDate(deliv.delivery_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};
