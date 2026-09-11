import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import {
  BarChart3,
  Calendar,
  Package,
  Users,
  TrendingUp,
  Receipt,
  IndianRupee,
  Loader2,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'DAILY' | 'PRODUCT' | 'CUSTOMER' | 'AGEING'>('DAILY');
  const [dailyData, setDailyData] = useState<any>(null);
  const [productData, setProductData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [recAgeing, setRecAgeing] = useState<any>(null);
  const [payAgeing, setPayAgeing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'DAILY') {
        const res = await api.getDailyReport();
        if (res.success) setDailyData(res.data);
      } else if (activeTab === 'PRODUCT') {
        const res = await api.getProductReport();
        if (res.success) setProductData(res.data);
      } else if (activeTab === 'CUSTOMER') {
        const res = await api.getCustomerReport();
        if (res.success) setCustomerData(res.data);
      } else if (activeTab === 'AGEING') {
        const [rRes, pRes] = await Promise.all([
          api.getReceivableAgeing(),
          api.getPayableAgeing(),
        ]);
        if (rRes.success) setRecAgeing(rRes.data);
        if (pRes.success) setPayAgeing(pRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Business Reports & Analytics
        </h2>
        <p className="text-xs text-slate-500">
          Daily delivery performance, product inventory sales, and customer outstanding ledger
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'DAILY'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daily Summary
        </button>

        <button
          onClick={() => setActiveTab('PRODUCT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PRODUCT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          Product Performance
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CUSTOMER'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Balances
        </button>

        <button
          onClick={() => setActiveTab('AGEING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'AGEING'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Ageing Analysis
        </button>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-xs font-semibold">Generating report...</p>
        </div>
      ) : activeTab === 'DAILY' && dailyData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Route</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{dailyData.totalCustomers}</p>
              <span className="text-xs text-slate-500">Customers</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Delivered</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{dailyData.deliveredCustomers}</p>
              <span className="text-xs text-emerald-600">Customers</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-700">Remaining</span>
              <p className="text-2xl font-black text-amber-800 mt-1">{dailyData.remainingCustomers}</p>
              <span className="text-xs text-amber-600">Pending</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-sky-700">Delivery Entries</span>
              <p className="text-2xl font-black text-sky-800 mt-1">{dailyData.deliveryEntries}</p>
              <span className="text-xs text-sky-600">Total Logs</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Today's Sales</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(dailyData.todaySales)}</p>
              <span className="text-xs text-slate-500">Billed Delivery Value</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Today's Collection</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(dailyData.todayCollection)}</p>
              <span className="text-xs text-slate-500">Cash & UPI</span>
            </div>

            <div className="col-span-2 bg-gradient-to-r from-rose-50 to-orange-50 p-4 rounded-2xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700">Total Outstanding Due</span>
              <p className="text-2xl font-black text-rose-800 mt-1">{formatCurrency(dailyData.totalOutstanding)}</p>
              <span className="text-xs text-rose-600">Pending collections across all customers</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'PRODUCT' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Remaining Stock</th>
                  <th className="py-3 px-4 text-right">Purchased Qty</th>
                  <th className="py-3 px-4 text-right">Delivered Qty</th>
                  <th className="py-3 px-4 text-right">Total Sales Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productData.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">
                      {p.currentStock} {p.baseUnit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {p.totalPurchasedQty} {p.baseUnit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {p.totalDeliveredQty} {p.baseUnit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(p.totalSalesValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'CUSTOMER' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4 text-right">Total Deliveries</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                  <th className="py-3 px-4 text-right">Total Payments</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerData.map((c) => (
                  <tr key={c.customerId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.customerName}</td>
                    <td className="py-3 px-4 text-slate-500">{c.mobile}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {c.totalDeliveriesCount}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {formatCurrency(c.totalDeliveryAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      {formatCurrency(c.totalPayments)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-700">
                      {formatCurrency(c.currentOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'AGEING' ? (
        <div className="space-y-6">
          {/* Customer Receivables Ageing */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Customer Receivables Ageing</h3>
                <p className="text-xs text-slate-500">Breakdown of outstanding dues by overdue bucket</p>
              </div>
              <span className="text-lg font-black text-rose-700">
                {formatCurrency(recAgeing?.totalOutstanding || 0)}
              </span>
            </div>

            {/* Buckets */}
            {recAgeing?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current (0d)</span>
                  <p className="text-base font-black text-slate-800 mt-1">{formatCurrency(recAgeing.summary.current)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">1 - 30 Days</span>
                  <p className="text-base font-black text-emerald-800 mt-1">{formatCurrency(recAgeing.summary.days_1_30)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">31 - 60 Days</span>
                  <p className="text-base font-black text-amber-800 mt-1">{formatCurrency(recAgeing.summary.days_31_60)}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="text-[10px] font-bold text-orange-600 uppercase">61 - 90 Days</span>
                  <p className="text-base font-black text-orange-800 mt-1">{formatCurrency(recAgeing.summary.days_61_90)}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">90+ Days</span>
                  <p className="text-base font-black text-rose-800 mt-1">{formatCurrency(recAgeing.summary.days_90_plus)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Payables Ageing */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Supplier Payables Ageing</h3>
                <p className="text-xs text-slate-500">Vendor liability aging across dairy supply partners</p>
              </div>
              <span className="text-lg font-black text-amber-700">
                {formatCurrency(payAgeing?.totalPayable || 0)}
              </span>
            </div>

            {/* Buckets */}
            {payAgeing?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current (0d)</span>
                  <p className="text-base font-black text-slate-800 mt-1">{formatCurrency(payAgeing.summary.current)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">1 - 30 Days</span>
                  <p className="text-base font-black text-slate-800 mt-1">{formatCurrency(payAgeing.summary.days_1_30)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">31 - 60 Days</span>
                  <p className="text-base font-black text-amber-800 mt-1">{formatCurrency(payAgeing.summary.days_31_60)}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="text-[10px] font-bold text-orange-600 uppercase">61 - 90 Days</span>
                  <p className="text-base font-black text-orange-800 mt-1">{formatCurrency(payAgeing.summary.days_61_90)}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">90+ Days</span>
                  <p className="text-base font-black text-rose-800 mt-1">{formatCurrency(payAgeing.summary.days_90_plus)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
