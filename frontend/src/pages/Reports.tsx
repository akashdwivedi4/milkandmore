import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
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
  Download,
  Printer,
  Search,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'OUTSTANDING' | 'COLLECTIONS' | 'DAILY' | 'PRODUCT' | 'AGEING'
  >('OUTSTANDING');

  // Reports raw data
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any>(null);
  const [productData, setProductData] = useState<any[]>([]);
  const [recAgeing, setRecAgeing] = useState<any>(null);
  const [payAgeing, setPayAgeing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Outstanding report filters (Section 17)
  const [outSearch, setOutSearch] = useState('');
  const [outStatus, setOutStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [outOnly, setOutOnly] = useState(true);

  // Collection report filters (Section 18)
  const [colSearch, setColSearch] = useState('');
  const [colMode, setColMode] = useState<string>('ALL');
  const [colDateFrom, setColDateFrom] = useState('');
  const [colDateTo, setColDateTo] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'OUTSTANDING') {
        const res = await api.getCustomerReport({ includeInactive: true });
        if (res.success) setCustomerData(res.data);
      } else if (activeTab === 'COLLECTIONS') {
        const res = await api.getPayments();
        if (res.success) setPaymentsData(res.data);
      } else if (activeTab === 'DAILY') {
        const res = await api.getDailyReport();
        if (res.success) setDailyData(res.data);
      } else if (activeTab === 'PRODUCT') {
        const res = await api.getProductReport();
        if (res.success) setProductData(res.data);
      } else if (activeTab === 'AGEING') {
        const [rRes, pRes] = await Promise.all([
          api.getReceivableAgeing(),
          api.getPayableAgeing(),
        ]);
        if (rRes.success) setRecAgeing(rRes.data);
        if (pRes.success) setPayAgeing(pRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  // Filtered Outstanding Customers
  const filteredOutstanding = useMemo(() => {
    return customerData.filter((c) => {
      const q = outSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.locality && c.locality.toLowerCase().includes(q));

      const matchesStatus = outStatus === 'ALL' || c.status === outStatus;
      const matchesOutstanding = !outOnly || (c.currentOutstanding || 0) > 0;

      return matchesSearch && matchesStatus && matchesOutstanding;
    });
  }, [customerData, outSearch, outStatus, outOnly]);

  // Filtered Collections
  const filteredCollections = useMemo(() => {
    return paymentsData.filter((p) => {
      const custName = (p.customer?.name || p.customer_name || '').toLowerCase();
      const custMobile = p.customer?.mobile || '';
      const ref = (p.reference_number || '').toLowerCase();
      const q = colSearch.trim().toLowerCase();

      const matchesSearch = !q || custName.includes(q) || custMobile.includes(q) || ref.includes(q);

      const pMode = (p.payment_mode || p.payment_method || '').toUpperCase();
      const matchesMode =
        colMode === 'ALL' ||
        (colMode === 'BANK_TRANSFER' ? pMode.includes('BANK') || pMode.includes('TRANSFER') : pMode === colMode);

      const pDate = (p.paid_at || p.payment_date || '').split('T')[0];
      const matchesFrom = !colDateFrom || pDate >= colDateFrom;
      const matchesTo = !colDateTo || pDate <= colDateTo;

      return matchesSearch && matchesMode && matchesFrom && matchesTo;
    });
  }, [paymentsData, colSearch, colMode, colDateFrom, colDateTo]);

  // Collection Summary metrics (Section 18 & 19)
  const colCash = filteredCollections
    .filter((p) => (p.payment_mode || p.payment_method || '').toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const colUpi = filteredCollections
    .filter((p) => (p.payment_mode || p.payment_method || '').toUpperCase() === 'UPI')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const colBank = filteredCollections
    .filter((p) => {
      const m = (p.payment_mode || p.payment_method || '').toUpperCase();
      return m.includes('BANK') || m.includes('TRANSFER');
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const colTotal = filteredCollections.reduce((sum, p) => sum + (p.amount || 0), 0);
  const colCount = filteredCollections.length;

  // Export Outstanding CSV
  const exportOutstandingCSV = () => {
    if (!filteredOutstanding.length) {
      showToast('No outstanding records to export', 'info');
      return;
    }
    const headers = ['Customer', 'Mobile', 'Address', 'Total Charges', 'Total Payments', 'Outstanding Balance'];
    const lines = [headers.join(',')];
    filteredOutstanding.forEach((c) => {
      lines.push(
        [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.mobile}"`,
          `"${(c.address || c.locality || '').replace(/"/g, '""')}"`,
          c.totalBilled || 0,
          c.totalPaid || 0,
          c.currentOutstanding || 0,
        ].join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Outstanding_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Outstanding Report exported to CSV', 'success');
  };

  // Export Collections CSV
  const exportCollectionsCSV = () => {
    if (!filteredCollections.length) {
      showToast('No collections to export', 'info');
      return;
    }
    const headers = ['Date & Time', 'Customer', 'Mobile', 'Payment Mode', 'Reference Number', 'Amount'];
    const lines = [headers.join(',')];
    filteredCollections.forEach((p) => {
      lines.push(
        [
          `"${p.paid_at || p.payment_date || ''}"`,
          `"${(p.customer?.name || p.customer_name || 'Customer').replace(/"/g, '""')}"`,
          `"${p.customer?.mobile || ''}"`,
          `"${p.payment_mode || p.payment_method || 'CASH'}"`,
          `"${(p.reference_number || '').replace(/"/g, '""')}"`,
          p.amount || 0,
        ].join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Collection_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Collection Report exported to CSV', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Accounting & Business Reports
          </h1>
          <p className="text-xs text-slate-500">
            Customer outstanding balances, collection registers, and dairy sales analytics
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('OUTSTANDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'OUTSTANDING'
              ? 'bg-[#6B1724] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Customer Outstanding Report
        </button>

        <button
          onClick={() => setActiveTab('COLLECTIONS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'COLLECTIONS'
              ? 'bg-[#2E7D32] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          Collection Report
        </button>

        <button
          onClick={() => setActiveTab('DAILY')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'DAILY'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Daily Summary
        </button>

        <button
          onClick={() => setActiveTab('PRODUCT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'PRODUCT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Product Performance
        </button>

        <button
          onClick={() => setActiveTab('AGEING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'AGEING'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Ageing Analysis
        </button>
      </div>

      {/* Report View */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#6B1724]" />
          <p className="text-xs font-semibold">Generating report data...</p>
        </div>
      ) : activeTab === 'OUTSTANDING' ? (
        /* ========================================================= */
        /* SECTION 17: CUSTOMER OUTSTANDING REPORT                   */
        /* ========================================================= */
        <div className="space-y-3">
          {/* Outstanding Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customer name, mobile..."
                  value={outSearch}
                  onChange={(e) => setOutSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={outStatus}
                  onChange={(e) => setOutStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Account Status</option>
                  <option value="ACTIVE">Active Accounts</option>
                  <option value="INACTIVE">Inactive Accounts</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={() => setOutOnly(!outOnly)}
                  className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    outOnly
                      ? 'bg-rose-100 border-rose-300 text-rose-900'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Outstanding Dues Only</span>
                </button>
              </div>

              <div className="sm:col-span-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOutSearch('');
                    setOutStatus('ALL');
                    setOutOnly(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={exportOutstandingCSV}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Outstanding Table: Customer | Mobile | Total Charges | Total Payments | Outstanding Balance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3 text-right">Total Charges</th>
                    <th className="py-2.5 px-3 text-right">Total Payments</th>
                    <th className="py-2.5 px-3 text-right font-black">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredOutstanding.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{c.mobile}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                        {formatCurrency(c.totalBilled || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#2E7D32] whitespace-nowrap">
                        {formatCurrency(c.totalPaid || 0)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                            (c.currentOutstanding || 0) > 0
                              ? 'bg-rose-100 text-rose-900 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {formatCurrency(c.currentOutstanding || 0)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/accounts?customerId=${c.id}`)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition-colors"
                          >
                            View Account
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/bills?customerId=${c.id}`)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition-colors"
                          >
                            View Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider">
                      Total Across Customers:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(
                        filteredOutstanding.reduce((sum, c) => sum + (c.totalBilled || 0), 0)
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#2E7D32]">
                      {formatCurrency(
                        filteredOutstanding.reduce((sum, c) => sum + (c.totalPaid || 0), 0)
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                      {formatCurrency(
                        filteredOutstanding.reduce((sum, c) => sum + (c.currentOutstanding || 0), 0)
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'COLLECTIONS' ? (
        /* ========================================================= */
        /* SECTION 18 & 19: COLLECTION REPORT & DAILY SUMMARY        */
        /* ========================================================= */
        <div className="space-y-3">
          {/* Daily Collection Summary Cards (Section 19) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Total Collection
              </span>
              <div className="text-lg font-black text-[#2E7D32]">
                {formatCurrency(colTotal)}
              </div>
              <p className="text-[10px] text-slate-400">All payment modes</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Cash Collection
              </span>
              <div className="text-lg font-black text-slate-900">
                {formatCurrency(colCash)}
              </div>
              <p className="text-[10px] text-slate-400">Direct cash</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                UPI Collection
              </span>
              <div className="text-lg font-black text-sky-800">
                {formatCurrency(colUpi)}
              </div>
              <p className="text-[10px] text-slate-400">Digital transfers</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Bank Transfer
              </span>
              <div className="text-lg font-black text-indigo-800">
                {formatCurrency(colBank)}
              </div>
              <p className="text-[10px] text-slate-400">NEFT / RTGS</p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Number of Payments
              </span>
              <div className="text-lg font-black text-slate-800">
                {colCount}
              </div>
              <p className="text-[10px] text-slate-400">Logged receipts</p>
            </div>
          </div>

          {/* Collection Filter Bar (Section 18) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customer, reference..."
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={colMode}
                  onChange={(e) => setColMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-1.5">
                <input
                  type="date"
                  value={colDateFrom}
                  onChange={(e) => setColDateFrom(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                  title="Date From"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={colDateTo}
                  onChange={(e) => setColDateTo(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                  title="Date To"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setColSearch('');
                    setColMode('ALL');
                    setColDateFrom('');
                    setColDateTo('');
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={exportCollectionsCSV}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Collections Table: Date | Customer | Payment Mode | Reference | Amount */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Payment Mode</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredCollections.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatDate(p.paid_at || p.payment_date || p.created_at)}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {p.customer?.name || p.customer_name || 'Customer'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {p.payment_mode || p.payment_method || 'CASH'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px] truncate max-w-xs">
                        {p.reference_number
                          ? `Ref: ${p.reference_number}${p.notes ? ` (${p.notes})` : ''}`
                          : p.notes || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#2E7D32] whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
                      Total Collections in Filter:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#2E7D32]">
                      {formatCurrency(colTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'DAILY' && dailyData ? (
        /* Daily Summary Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Route</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{dailyData.totalCustomers}</p>
              <span className="text-xs text-slate-500">Customers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Delivered</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {dailyData.deliveredCustomers}
              </p>
              <span className="text-xs text-emerald-600">Customers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-700">Remaining</span>
              <p className="text-2xl font-black text-amber-800 mt-1">
                {dailyData.remainingCustomers}
              </p>
              <span className="text-xs text-amber-600">Pending</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-sky-700">Delivery Entries</span>
              <p className="text-2xl font-black text-sky-800 mt-1">{dailyData.deliveryEntries}</p>
              <span className="text-xs text-sky-600">Total Logs</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Today's Sales</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(dailyData.todaySales)}
              </p>
              <span className="text-xs text-slate-500">Billed Delivery Value</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Today's Collection</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(dailyData.todayCollection)}
              </p>
              <span className="text-xs text-slate-500">Cash & UPI</span>
            </div>

            <div className="col-span-2 bg-gradient-to-r from-rose-50 to-orange-50 p-4 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700">
                Total Outstanding Due
              </span>
              <p className="text-2xl font-black text-rose-800 mt-1">
                {formatCurrency(dailyData.totalOutstanding)}
              </p>
              <span className="text-xs text-rose-600">Across all customers</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'PRODUCT' ? (
        /* Product Performance Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                  <tr key={p.productId || p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">
                      {p.currentStock} {p.baseUnit || p.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {p.totalPurchasedQty || 0} {p.baseUnit || p.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {p.totalDeliveredQty || p.totalSold || 0} {p.baseUnit || p.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(p.totalSalesValue || p.totalRevenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Ageing Analysis Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Customer Receivable Ageing</h3>
              {recAgeing ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">0 - 30 Days</span>
                    <span className="font-bold">{formatCurrency(recAgeing.current || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">31 - 60 Days</span>
                    <span className="font-bold">{formatCurrency(recAgeing.days30 || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">61 - 90 Days</span>
                    <span className="font-bold">{formatCurrency(recAgeing.days60 || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">90+ Days</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(recAgeing.days90Plus || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No receivable data</p>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Supplier Payable Ageing</h3>
              {payAgeing ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">0 - 30 Days</span>
                    <span className="font-bold">{formatCurrency(payAgeing.current || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">31 - 60 Days</span>
                    <span className="font-bold">{formatCurrency(payAgeing.days30 || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">61 - 90 Days</span>
                    <span className="font-bold">{formatCurrency(payAgeing.days60 || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">90+ Days</span>
                    <span className="font-bold text-rose-600">
                      {formatCurrency(payAgeing.days90Plus || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No payable data</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
