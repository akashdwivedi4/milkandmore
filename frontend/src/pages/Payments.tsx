import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Payment, Customer } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import {
  Receipt,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Loader2,
  Filter,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  Download,
  Printer,
} from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';
import { PaymentDetailModal } from '../components/PaymentDetailModal';
import { EditPaymentModal } from '../components/EditPaymentModal';

export const Payments: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (Section 12)
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected customer for creating payment
  const [selectedCustomerForNewPayment, setSelectedCustomerForNewPayment] = useState<any | null>(null);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);

  // Modals for actions
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, custRes] = await Promise.all([
        api.getPayments(),
        api.getCustomerReport({ includeInactive: true }),
      ]);

      if (payRes.success) setPayments(payRes.data);
      if (custRes.success) setCustomers(custRes.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments register', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map customer ID to customer account object for balance lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, any>();
    customers.forEach((c) => {
      map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const custId = p.customer_id || (p.customer as any)?._id || (p.customer as any)?.id || '';
      const custName = (p.customer?.name || (p as any).customer_name || '').toLowerCase();
      const custMobile = (p.customer?.mobile || '');
      const q = search.trim().toLowerCase();

      const matchesSearch = !q || custName.includes(q) || custMobile.includes(q) || (p.reference_number && p.reference_number.toLowerCase().includes(q));

      const matchesCustomer = customerFilter === 'ALL' || custId === customerFilter;

      const pMode = (p.payment_mode || p.payment_method || '').toUpperCase();
      const matchesMethod =
        methodFilter === 'ALL' ||
        (methodFilter === 'BANK_TRANSFER' ? (pMode.includes('BANK') || pMode.includes('TRANSFER')) : pMode === methodFilter);

      const pDate = (p.paid_at || (p as any).payment_date || '').split('T')[0];
      const matchesDateFrom = !dateFrom || pDate >= dateFrom;
      const matchesDateTo = !dateTo || pDate <= dateTo;

      return matchesSearch && matchesCustomer && matchesMethod && matchesDateFrom && matchesDateTo;
    });
  }, [payments, search, customerFilter, methodFilter, dateFrom, dateTo]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setCustomerFilter('ALL');
    setMethodFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  // KPI Metrics (Section 11)
  const totalCollections = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashCollections = filteredPayments
    .filter((p) => (p.payment_mode || p.payment_method || '').toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const upiCollections = filteredPayments
    .filter((p) => (p.payment_mode || p.payment_method || '').toUpperCase() === 'UPI')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const bankCollections = filteredPayments
    .filter((p) => {
      const m = (p.payment_mode || p.payment_method || '').toUpperCase();
      return m.includes('BANK') || m.includes('TRANSFER');
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaymentsCount = filteredPayments.length;

  // Safe delete payment
  const handleDeletePayment = async (id: string) => {
    try {
      setDeleting(true);
      const res = await api.deletePayment(id);
      if (res.success) {
        showToast('Payment deleted and account balance updated.', 'success');
        setDeletingPaymentId(null);
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete payment', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredPayments.length) {
      showToast('No payments to export', 'info');
      return;
    }
    const headers = ['#', 'Date & Time', 'Customer', 'Mobile', 'Payment Mode', 'Reference Number', 'Notes', 'Amount'];
    const lines = [headers.join(',')];

    filteredPayments.forEach((p, idx) => {
      const line = [
        idx + 1,
        `"${p.paid_at || (p as any).payment_date || ''}"`,
        `"${(p.customer?.name || (p as any).customer_name || 'Customer').replace(/"/g, '""')}"`,
        `"${p.customer?.mobile || ''}"`,
        `"${(p.payment_mode || p.payment_method || 'CASH')}"`,
        `"${(p.reference_number || '').replace(/"/g, '""')}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
        p.amount || 0,
      ];
      lines.push(line.join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Payment_Register_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    URL.revokeObjectURL(url);
    showToast('Payment Register exported to CSV', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header (Section 11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Payment Register
          </h1>
          <p className="text-xs text-slate-500">
            Manage customer payments and collections
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Register</span>
          </button>
          <button
            onClick={() => setIsCustomerSelectOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {/* Total Collections */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Collections
          </span>
          <div className="text-lg font-black text-[#2E7D32]">
            {formatCurrency(totalCollections)}
          </div>
          <p className="text-[10px] text-slate-400">Total received</p>
        </div>

        {/* Cash Collections */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Cash Collections
          </span>
          <div className="text-lg font-black text-slate-900">
            {formatCurrency(cashCollections)}
          </div>
          <p className="text-[10px] text-slate-400">Direct cash</p>
        </div>

        {/* UPI Collections */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            UPI Collections
          </span>
          <div className="text-lg font-black text-sky-800">
            {formatCurrency(upiCollections)}
          </div>
          <p className="text-[10px] text-slate-400">Digital UPI</p>
        </div>

        {/* Bank Collections */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Bank Collections
          </span>
          <div className="text-lg font-black text-indigo-800">
            {formatCurrency(bankCollections)}
          </div>
          <p className="text-[10px] text-slate-400">Bank transfers</p>
        </div>

        {/* Total Payments Count */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Payments
          </span>
          <div className="text-lg font-black text-slate-800">
            {totalPaymentsCount}
          </div>
          <p className="text-[10px] text-slate-400">Receipts logged</p>
        </div>
      </div>

      {/* Professional Filter Bar (Section 12) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search Customer */}
          <div className="sm:col-span-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone, ref..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>

          {/* Customer Dropdown Filter */}
          <div className="sm:col-span-3">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div className="sm:col-span-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Date Range: From & To */}
          <div className="sm:col-span-3 flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
              title="Date From"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
              title="Date To"
            />
          </div>

          {/* Reset Button */}
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="sm:hidden">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Register Table (Section 13: # | Date & Time | Customer | Mobile | Payment Mode | Reference / Note | Amount | Balance After Payment | Action) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2E7D32]" />
            <p className="text-xs font-semibold">Loading payment transactions...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">No payment transactions found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Click Record Payment to log customer collections.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3 text-center">Payment Mode</th>
                  <th className="py-2.5 px-3">Reference / Note</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right font-black">Balance After Payment</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.map((p, idx) => {
                  const custId =
                    p.customer_id ||
                    (p.customer as any)?._id ||
                    (p.customer as any)?.id ||
                    '';
                  const custAccount = customerMap.get(custId);
                  const custBalance = custAccount?.currentOutstanding ?? 0;

                  const pMode = (p.payment_mode || p.payment_method || 'CASH').toUpperCase();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(p.paid_at || (p as any).payment_date || p.created_at)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/accounts?customerId=${custId}`)}
                          className="font-bold text-slate-900 hover:text-[#6B1724] hover:underline transition-colors"
                        >
                          {p.customer?.name || (p as any).customer_name || 'Customer'}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {p.customer?.mobile || '—'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {pMode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs italic max-w-xs truncate">
                        {p.reference_number
                          ? `Ref: ${p.reference_number}${p.notes ? ` (${p.notes})` : ''}`
                          : p.notes || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[13px] text-[#2E7D32] whitespace-nowrap">
                        - {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            custBalance > 0
                              ? 'bg-rose-50 text-rose-900 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {formatCurrency(custBalance)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingPayment(p)}
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            title="View Receipt & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPayment(p)}
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPaymentId(p.id)}
                            className="p-1 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider">
                    Total Collections in View:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-[#2E7D32] whitespace-nowrap">
                    {formatCurrency(totalCollections)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Customer Selector Modal before recording payment */}
      {isCustomerSelectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Select Customer to Record Payment</h3>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerForNewPayment(c);
                    setIsCustomerSelectOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{c.mobile}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-700 block">
                      {formatCurrency(c.currentOutstanding || 0)}
                    </span>
                    <span className="text-[10px] text-[#2E7D32] font-bold">Select →</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCustomerSelectOpen(false)}
              className="mt-3 w-full py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedCustomerForNewPayment && (
        <PaymentModal
          customer={selectedCustomerForNewPayment}
          isOpen={!!selectedCustomerForNewPayment}
          initialOutstanding={selectedCustomerForNewPayment.currentOutstanding}
          onClose={() => setSelectedCustomerForNewPayment(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* View Payment Receipt Modal */}
      {viewingPayment && (
        <PaymentDetailModal
          payment={viewingPayment}
          isOpen={!!viewingPayment}
          onClose={() => setViewingPayment(null)}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Delete Payment Confirmation Dialog */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Delete Payment Record?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this payment? Customer balance will be updated and
              reconciled.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPaymentId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDeletePayment(deletingPaymentId)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
