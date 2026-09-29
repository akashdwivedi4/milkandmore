import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, CustomerBillStatement, Payment } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import { PaymentModal } from '../components/PaymentModal';
import { DeliveryModal } from '../components/DeliveryModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { PaymentDetailModal } from '../components/PaymentDetailModal';
import { EditPaymentModal } from '../components/EditPaymentModal';
import {
  Search,
  Calendar,
  IndianRupee,
  Receipt,
  Truck,
  FileText,
  Printer,
  Download,
  Plus,
  RefreshCw,
  QrCode,
  User,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sun,
  Moon,
  ChevronDown,
  ArrowLeft,
  Edit2,
  Trash2,
  Eye,
  RotateCcw,
  X,
} from 'lucide-react';

export const CustomerAccounts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const urlCustomerId = searchParams.get('customerId') || searchParams.get('id') || '';
  const urlFromDate = searchParams.get('startDate') || searchParams.get('from') || '';
  const urlToDate = searchParams.get('endDate') || searchParams.get('to') || '';

  // Mode: Master List vs Account Detail
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(urlCustomerId);

  // Master customer accounts list
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Master filters
  const [searchQuery, setSearchQuery] = useState('');
  const [alphabetFilter, setAlphabetFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DUE' | 'CREDIT' | 'SETTLED'>('ALL');

  // Detail view state
  const [fromDate, setFromDate] = useState<string>(urlFromDate);
  const [toDate, setToDate] = useState<string>(urlToDate);
  const [statement, setStatement] = useState<CustomerBillStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Ledger in-table filters
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'MORNING' | 'EVENING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DELIVERY' | 'PAYMENT'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals
  const [activeCustomerForAction, setActiveCustomerForAction] = useState<any | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [deleteCustomerModalOpen, setDeleteCustomerModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Refund Credit Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundPaymentMode, setRefundPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'UPI'>('CASH');
  const [refundNotes, setRefundNotes] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Payment modals for ledger actions
  const [selectedPaymentForView, setSelectedPaymentForView] = useState<any | null>(null);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<any | null>(null);
  const [deletePaymentConfirmId, setDeletePaymentConfirmId] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);

  // Load all customer accounts data (Single source of truth from getCustomerReport)
  const loadCustomerAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const res = await api.getCustomerReport({ includeInactive: true });
      if (res.success && Array.isArray(res.data)) {
        setCustomerAccounts(res.data);
      } else {
        setCustomerAccounts([]);
      }
    } catch (err: any) {
      console.error('Failed to load customer accounts:', err);
      showToast(err.message || 'Failed to load customer accounts', 'error');
    } finally {
      setLoadingAccounts(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCustomerAccounts();
  }, [loadCustomerAccounts]);

  // Sync selectedCustomerId with URL
  useEffect(() => {
    if (urlCustomerId && urlCustomerId !== selectedCustomerId) {
      setSelectedCustomerId(urlCustomerId);
    }
  }, [urlCustomerId]);

  const selectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const newParams = new URLSearchParams(searchParams);
    if (id) newParams.set('customerId', id);
    else newParams.delete('customerId');
    setSearchParams(newParams);
  };

  const backToAccountsList = () => {
    setSelectedCustomerId('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('customerId');
    newParams.delete('id');
    setSearchParams(newParams);
  };

  // Fetch statement & ledger for selected customer
  const fetchStatement = useCallback(
    async (cId: string, sDate?: string, eDate?: string) => {
      if (!cId) return;
      try {
        setLoadingStatement(true);
        const res = await api.getStatement(cId, sDate || undefined, eDate || undefined);
        if (res.success && res.data) {
          setStatement(res.data);
        } else {
          setStatement(null);
        }
      } catch (err: any) {
        console.error('Failed to load account ledger:', err);
        showToast(err.message || 'Failed to load account ledger', 'error');
        setStatement(null);
      } finally {
        setLoadingStatement(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (selectedCustomerId) {
      fetchStatement(selectedCustomerId, fromDate, toDate);
    }
  }, [selectedCustomerId, fromDate, toDate, fetchStatement]);

  // Current selected customer object
  const currentCustomer = useMemo(() => {
    return customerAccounts.find((c) => c.id === selectedCustomerId) || null;
  }, [customerAccounts, selectedCustomerId]);

  // Filter master customer accounts list
  const filteredAccounts = useMemo(() => {
    let list = customerAccounts;

    // A-Z filter
    if (alphabetFilter !== 'ALL') {
      list = list.filter((c) => c.name.toUpperCase().startsWith(alphabetFilter));
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((c) => c.status === statusFilter);
    }

    // Balance filter
    if (balanceFilter === 'DUE') {
      list = list.filter((c) => (c.currentOutstanding || 0) > 0);
    } else if (balanceFilter === 'CREDIT') {
      list = list.filter(
        (c) =>
          (c.customerCredit || 0) > 0 ||
          (c.currentOutstanding || 0) < 0 ||
          c.accountStatus === 'CUSTOMER_CREDIT'
      );
    } else if (balanceFilter === 'SETTLED') {
      list = list.filter(
        (c) =>
          (c.currentOutstanding || 0) === 0 &&
          (c.customerCredit || 0) === 0 &&
          c.accountStatus !== 'CUSTOMER_CREDIT'
      );
    }

    // Free text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.locality && c.locality.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customerAccounts, alphabetFilter, statusFilter, balanceFilter, searchQuery]);

  // Alphabet list with customer counts
  const alphabetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customerAccounts.forEach((c) => {
      const letter = c.name ? c.name[0].toUpperCase() : '';
      if (letter >= 'A' && letter <= 'Z') {
        counts[letter] = (counts[letter] || 0) + 1;
      }
    });
    return counts;
  }, [customerAccounts]);

  const resetMasterFilters = () => {
    setSearchQuery('');
    setAlphabetFilter('ALL');
    setStatusFilter('ALL');
    setBalanceFilter('ALL');
  };

  // Quick date presets for ledger
  const applyDatePreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME') => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = now.toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'ALL_TIME') {
      setFromDate('');
      setToDate('');
    }
  };

  // Build ledger table rows from statement entries
  const ledgerRows = useMemo(() => {
    if (!statement || !statement.entries) return [];

    let rows = statement.entries.map((e: any, idx: number) => {
      const session =
        e.shift ||
        (e.description?.toLowerCase().includes('evening')
          ? 'EVENING'
          : e.description?.toLowerCase().includes('morning')
          ? 'MORNING'
          : '—');
      return {
        id: e.refId || idx.toString(),
        index: idx + 1,
        date: e.date,
        session,
        type: e.type, // 'DELIVERY' | 'PAYMENT'
        description: e.description,
        debit: e.debit || 0,
        credit: e.credit || 0,
        balance: e.balance,
        paymentMode: e.paymentMode || '',
        referenceNumber: e.referenceNumber || '',
        notes: e.notes || '',
        items: e.items || [],
        rawEntry: e,
      };
    });

    if (sessionFilter !== 'ALL') {
      rows = rows.filter((r: any) => r.session === sessionFilter || r.type === 'PAYMENT');
    }

    if (typeFilter !== 'ALL') {
      rows = rows.filter((r: any) => r.type === typeFilter);
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase().trim();
      rows = rows.filter(
        (r: any) =>
          r.date.includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.session.toLowerCase().includes(q) ||
          (r.referenceNumber && r.referenceNumber.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [statement, sessionFilter, typeFilter, ledgerSearch]);

  // Account summary metrics
  const summary = statement?.summary;
  const currentOutstanding = Math.max(
    0,
    summary?.finalOutstanding ?? currentCustomer?.currentOutstanding ?? 0
  );
  const customerCredit =
    summary?.customerCredit ??
    currentCustomer?.customerCredit ??
    (summary?.finalOutstanding && summary.finalOutstanding < 0
      ? Math.abs(summary.finalOutstanding)
      : currentCustomer?.currentOutstanding && currentCustomer.currentOutstanding < 0
      ? Math.abs(currentCustomer.currentOutstanding)
      : 0);
  const isDue = currentOutstanding > 0;

  // Handle customer advance credit refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid refund amount.', 'error');
      return;
    }
    if (amt > customerCredit) {
      showToast(
        `Refund amount cannot exceed available credit of ${formatCurrency(customerCredit)}`,
        'error'
      );
      return;
    }
    try {
      setSubmittingRefund(true);
      const res = await api.refundCustomerCredit(currentCustomer.id, {
        amount: amt,
        paymentMode: refundPaymentMode,
        notes: refundNotes.trim() || undefined,
      });
      if (res.success) {
        showToast(`Refund of ${formatCurrency(amt)} processed successfully!`, 'success');
        setRefundModalOpen(false);
        setRefundAmount('');
        setRefundNotes('');
        loadCustomerAccounts();
        fetchStatement(currentCustomer.id, fromDate, toDate);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to process refund', 'error');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Safe delete customer
  const handleDeleteCustomer = async () => {
    const customerId = activeCustomerForAction?.id || activeCustomerForAction?._id;
    if (!customerId) return;
    try {
      setDeletingCustomer(true);
      const res = await api.deleteCustomer(customerId);
      if (res.success) {
        showToast(res.message || 'Customer account deleted safely.', 'success');
        setDeleteCustomerModalOpen(false);
        setActiveCustomerForAction(null);
        if (selectedCustomerId === customerId) {
          backToAccountsList();
        }
        await loadCustomerAccounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
    } finally {
      setDeletingCustomer(false);
    }
  };

  // Safe delete payment
  const handleDeletePayment = async (paymentId: string) => {
    try {
      setDeletingPayment(true);
      const res = await api.deletePayment(paymentId);
      if (res.success) {
        showToast('Payment deleted and account balance updated.', 'success');
        setDeletePaymentConfirmId(null);
        if (selectedCustomerId) {
          fetchStatement(selectedCustomerId, fromDate, toDate);
        }
        loadCustomerAccounts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete payment', 'error');
    } finally {
      setDeletingPayment(false);
    }
  };

  // Export Master Accounts to CSV
  const handleExportMasterCSV = () => {
    if (!filteredAccounts.length) {
      showToast('No customer accounts to export', 'info');
      return;
    }
    const headers = [
      'Customer ID',
      'Customer Name',
      'Mobile',
      'Address',
      'Opening Balance',
      'Total Charges',
      'Total Payments',
      'Outstanding Balance',
      'Last Transaction',
      'Status',
    ];
    const csvLines = [headers.join(',')];

    filteredAccounts.forEach((c) => {
      const line = [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.mobile}"`,
        `"${(c.address || c.locality || '').replace(/"/g, '""')}"`,
        c.openingBalance || 0,
        c.totalBilled || 0,
        c.totalPaid || 0,
        c.currentOutstanding || 0,
        `"${c.lastTransaction || '—'}"`,
        `"${c.status || 'ACTIVE'}"`,
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Customer_Accounts_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.click();
    URL.revokeObjectURL(url);
    showToast('Customer Accounts exported to CSV', 'success');
  };

  // Export Ledger to CSV
  const handleExportLedgerCSV = () => {
    if (!ledgerRows.length) {
      showToast('No ledger entries to export', 'info');
      return;
    }
    const headers = [
      '#',
      'Date',
      'Session',
      'Type',
      'Description',
      'Charges (Debit)',
      'Payment (Credit)',
      'Running Balance',
      'Reference / Notes',
    ];
    const csvLines = [headers.join(',')];

    ledgerRows.forEach((r: any) => {
      const line = [
        r.index,
        `"${r.date}"`,
        `"${r.session}"`,
        `"${r.type}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        r.debit,
        r.credit,
        r.balance,
        `"${(r.referenceNumber || r.notes || '').replace(/"/g, '""')}"`,
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Account_Ledger_${currentCustomer?.name.replace(/\s+/g, '_') || 'Customer'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.click();
    URL.revokeObjectURL(url);
    showToast('Account ledger exported to CSV', 'success');
  };

  // ==========================================
  // VIEW 1: MASTER CUSTOMER ACCOUNTS TABLE
  // ==========================================
  if (!selectedCustomerId) {
    return (
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Customer Accounts
            </h1>
            <p className="text-xs text-slate-500">
              Customer ledger balances, total deliveries, payments, and account statements
            </p>
          </div>

          {/* Master Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportMasterCSV}
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
              <span>Print List</span>
            </button>
          </div>
        </div>

        {/* A–Z Alphabet Quick Filter Bar (Section 20) */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 px-1">
              A–Z:
            </span>
            <button
              type="button"
              onClick={() => setAlphabetFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-colors ${
                alphabetFilter === 'ALL'
                  ? 'bg-[#6B1724] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              ALL ({customerAccounts.length})
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => {
              const count = alphabetCounts[char] || 0;
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => setAlphabetFilter(char)}
                  disabled={count === 0}
                  className={`px-2 py-1 rounded-md font-bold text-xs transition-colors ${
                    alphabetFilter === char
                      ? 'bg-[#6B1724] text-white'
                      : count > 0
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                  title={`${count} customers starting with ${char}`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Bar (Section 21) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Search */}
            <div className="sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer name, mobile, address, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Account Status</option>
                <option value="ACTIVE">Active Accounts Only</option>
                <option value="INACTIVE">Inactive Accounts Only</option>
              </select>
            </div>

            {/* Balance Filter */}
            <div className="sm:col-span-3">
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Balances</option>
                <option value="DUE">Outstanding Dues Only</option>
                <option value="CREDIT">Customer Credit / Advance Only</option>
                <option value="SETTLED">Settled Accounts (₹0)</option>
              </select>
            </div>

            {/* Reset */}
            <div className="sm:col-span-1">
              <button
                type="button"
                onClick={resetMasterFilters}
                className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
                title="Reset All Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sm:hidden">Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Master Accounts Table (Section 6) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer Accounts Master List ({filteredAccounts.length} accounts)
            </span>
            <button
              type="button"
              onClick={loadCustomerAccounts}
              disabled={loadingAccounts}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAccounts ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {loadingAccounts ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#6B1724]" />
                <p className="text-xs font-semibold">Loading customer accounts...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <Receipt className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                <p className="text-sm font-bold text-slate-700">No customer accounts match criteria</p>
                <p className="text-xs text-slate-400">Try resetting filters or search keywords.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3 text-right">Opening Balance</th>
                    <th className="py-2.5 px-3 text-right">Total Charges</th>
                    <th className="py-2.5 px-3 text-right">Total Payments</th>
                    <th className="py-2.5 px-3 text-right font-black text-rose-800">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-right font-black text-emerald-800">Customer Credit</th>
                    <th className="py-2.5 px-3 text-center">Last Transaction</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredAccounts.map((c, idx) => {
                    const outstanding = Math.max(0, c.currentOutstanding || 0);
                    const credit = c.customerCredit ?? (c.currentOutstanding < 0 ? Math.abs(c.currentOutstanding) : 0);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => selectCustomer(c.id)}
                            className="text-left group font-bold text-slate-900 hover:text-[#6B1724] transition-colors"
                          >
                            <span className="group-hover:underline">{c.name}</span>
                            {c.locality && (
                              <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">
                                {c.locality}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {c.mobile}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatCurrency(c.openingBalance || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                          {formatCurrency(c.totalBilled || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#2E7D32] whitespace-nowrap">
                          {formatCurrency(c.totalPaid || 0)}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                              outstanding > 0
                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {formatCurrency(outstanding)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-black px-2 py-0.5 rounded text-[11px] ${
                              credit > 0
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'text-slate-300'
                            }`}
                          >
                            {credit > 0 ? formatCurrency(credit) : '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-[11px] text-slate-600 whitespace-nowrap">
                          {c.lastTransaction || '—'}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {c.status === 'ACTIVE' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => selectCustomer(c.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition-colors"
                              title="View Account & Ledger"
                            >
                              View Account
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/bills?customerId=${c.id}`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition-colors"
                              title="View Customer Statement"
                            >
                              Statement
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomerForAction(c);
                                setPaymentModalOpen(true);
                              }}
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 text-[#2E7D32] border border-emerald-200 rounded transition-colors"
                              title="Record Payment"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomerForAction(c);
                                setDeliveryModalOpen(true);
                              }}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-[#6B1724] border border-rose-200 rounded transition-colors"
                              title="Add Delivery"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomerForAction(c);
                                setEditCustomerModalOpen(true);
                              }}
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition-colors"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomerForAction(c);
                                setDeleteCustomerModalOpen(true);
                              }}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Global Modals for Master Screen Actions */}
        {activeCustomerForAction && paymentModalOpen && (
          <PaymentModal
            customer={activeCustomerForAction}
            isOpen={paymentModalOpen}
            initialOutstanding={activeCustomerForAction.currentOutstanding}
            onClose={() => {
              setPaymentModalOpen(false);
              setActiveCustomerForAction(null);
            }}
            onSuccess={() => {
              loadCustomerAccounts();
            }}
          />
        )}

        {activeCustomerForAction && deliveryModalOpen && (
          <DeliveryModal
            customer={activeCustomerForAction}
            isOpen={deliveryModalOpen}
            onClose={() => {
              setDeliveryModalOpen(false);
              setActiveCustomerForAction(null);
            }}
            onSuccess={() => {
              loadCustomerAccounts();
            }}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CUSTOMER ACCOUNT DETAIL & LEDGER
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backToAccountsList}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Accounts</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Customer Account
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportLedgerCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export Ledger to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            title="Print Account Ledger"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print Grid</span>
          </button>
        </div>
      </div>

      {/* Customer Information Card (Section 7) */}
      {currentCustomer && (
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-[#6B1724] text-white flex items-center justify-center font-black text-sm">
                  {currentCustomer.name[0]}
                </div>
                <h2 className="text-lg font-black text-slate-900">{currentCustomer.name}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  ID: {currentCustomer.id.slice(-6).toUpperCase()}
                </span>
                {currentCustomer.status === 'ACTIVE' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                    Inactive
                  </span>
                )}
                {currentCustomer.assignedQr && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-sky-600" />
                    QR: {currentCustomer.assignedQr}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {currentCustomer.mobile}
                </span>
                {currentCustomer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {currentCustomer.address}
                  </span>
                )}
                {currentCustomer.customerSince && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Customer Since: {formatDate(currentCustomer.customerSince)}
                  </span>
                )}
                {currentCustomer.serviceEndDate && (
                  <span className="flex items-center gap-1 text-amber-700 font-medium">
                    Service Ended: {formatDate(currentCustomer.serviceEndDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Bar (Section 7) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {customerCredit > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRefundAmount(customerCredit.toString());
                    setRefundModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  title="Refund available customer advance credit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refund Credit ({formatCurrency(customerCredit)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setDeliveryModalOpen(true)}
                className="px-3 py-1.5 bg-[#6B1724] hover:bg-[#55121D] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                Add Delivery
              </button>
              <button
                type="button"
                onClick={() => navigate(`/customers/${currentCustomer.id}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                title="View Customer Details"
              >
                <Eye className="w-3.5 h-3.5" />
                View Details
              </button>
              <button
                type="button"
                onClick={() => setEditCustomerModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                title="Edit Customer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCustomerForAction(currentCustomer);
                  setDeleteCustomerModalOpen(true);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                title="Delete Customer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => navigate(`/bills?customerId=${currentCustomer.id}`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                title="View Customer Statement"
              >
                <FileText className="w-3.5 h-3.5" />
                Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Summary Cards (Section 8 - 7 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* Metric 1: Opening Balance */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Opening Balance
          </span>
          <div className="text-base font-black text-slate-800">
            {formatCurrency(summary?.openingBalance || currentCustomer?.openingBalance || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Account setup</p>
        </div>

        {/* Metric 2: Today's Charges */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Today's Charges
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700">
              {summary?.todayDropsCount ?? 0}
            </span>
          </div>
          <div className="text-base font-black text-sky-800">
            {formatCurrency(summary?.todayDeliveryAmount || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Today's drops</p>
        </div>

        {/* Metric 3: Total Deliveries */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Deliveries
          </span>
          <div className="text-base font-black text-amber-900">
            {summary?.totalDeliveriesCount ?? currentCustomer?.deliveryCount ?? 0}
          </div>
          <p className="text-[10px] text-slate-400">Total drops logged</p>
        </div>

        {/* Metric 4: Total Charges */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Charges
          </span>
          <div className="text-base font-black text-slate-900">
            {formatCurrency(summary?.periodDeliveryAmount ?? currentCustomer?.totalBilled ?? 0)}
          </div>
          <p className="text-[10px] text-slate-400">Deliveries billed</p>
        </div>

        {/* Metric 5: Total Payments */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Payments
          </span>
          <div className="text-base font-black text-[#2E7D32]">
            {formatCurrency(summary?.periodPaymentsAmount ?? currentCustomer?.totalPaid ?? 0)}
          </div>
          <p className="text-[10px] text-slate-400">Collections credited</p>
        </div>

        {/* Metric 6: Current Outstanding */}
        <div
          className={`p-3 rounded-xl border shadow-xs space-y-1 ${
            isDue
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider block truncate">
              Outstanding
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                isDue ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isDue ? 'Due' : 'Cleared'}
            </span>
          </div>
          <div className="text-base font-black tracking-tight">
            {formatCurrency(currentOutstanding)}
          </div>
          <p className="text-[10px] opacity-80 truncate">
            {isDue ? 'Payment pending' : 'Zero outstanding'}
          </p>
        </div>

        {/* Metric 7: Customer Credit / Advance Available */}
        <div
          className={`p-3 rounded-xl border shadow-xs space-y-1 ${
            customerCredit > 0
              ? 'bg-blue-50 border-blue-200 text-blue-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider block truncate">
              Customer Credit
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                customerCredit > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {customerCredit > 0 ? 'Advance' : 'Nil'}
            </span>
          </div>
          <div className="text-base font-black tracking-tight text-blue-900">
            {formatCurrency(customerCredit)}
          </div>
          <p className="text-[10px] opacity-80 truncate">
            {customerCredit > 0 ? 'Prepaid credit held' : 'No advance credit'}
          </p>
        </div>
      </div>

      {/* Customer Ledger Table (Section 9) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Ledger Toolbar with Date Range, Shifts, Types */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer Ledger
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                ({ledgerRows.length} transactions)
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Session Filter */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg text-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSessionFilter('ALL')}
                  className={`px-2.5 py-1 font-bold ${
                    sessionFilter === 'ALL'
                      ? 'bg-[#6B1724] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('MORNING')}
                  className={`px-2.5 py-1 font-bold ${
                    sessionFilter === 'MORNING'
                      ? 'bg-[#6B1724] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('EVENING')}
                  className={`px-2.5 py-1 font-bold ${
                    sessionFilter === 'EVENING'
                      ? 'bg-[#6B1724] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Evening
                </button>
              </div>

              {/* Transaction Type Filter */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg text-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-2.5 py-1 font-bold ${
                    typeFilter === 'ALL'
                      ? 'bg-[#2E7D32] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('DELIVERY')}
                  className={`px-2.5 py-1 font-bold ${
                    typeFilter === 'DELIVERY'
                      ? 'bg-[#2E7D32] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Deliveries
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('PAYMENT')}
                  className={`px-2.5 py-1 font-bold ${
                    typeFilter === 'PAYMENT'
                      ? 'bg-[#2E7D32] text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Payments
                </button>
              </div>

              {/* Ledger text filter */}
              <input
                type="text"
                placeholder="Filter ledger rows..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B1724]"
              />
            </div>
          </div>

          {/* Date Range Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Date Range:
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyDatePreset('THIS_MONTH')}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('LAST_MONTH')}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] transition-colors"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('ALL_TIME')}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-[11px] transition-colors"
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => fetchStatement(selectedCustomerId, fromDate, toDate)}
                disabled={loadingStatement}
                className="px-2.5 py-1 rounded-md bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-[11px] transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingStatement ? 'animate-spin' : ''}`} />
                Get Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table (Columns: Date | Transaction Type | Description | Reference | Charges | Payment | Balance | Action) */}
        <div className="overflow-x-auto">
          {loadingStatement ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#6B1724]" />
              <p className="text-xs font-semibold">Loading customer ledger...</p>
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <Receipt className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-700">No ledger records found</p>
              <p className="text-xs text-slate-400">
                Try expanding your date filter or adding a delivery/payment.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3 text-right">Charges (Debit)</th>
                  <th className="py-2.5 px-3 text-right">Payment (Credit)</th>
                  <th className="py-2.5 px-3 text-right text-blue-700">Credit Applied</th>
                  <th className="py-2.5 px-3 text-right font-black text-rose-800">Outstanding</th>
                  <th className="py-2.5 px-3 text-right font-black text-emerald-800">Customer Credit</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ledgerRows.map((r: any) => {
                  const isDelivery = r.type === 'DELIVERY';
                  const isPayment = r.type === 'PAYMENT';

                  // Determine human-readable transaction type label
                  let typeLabel = r.type;
                  if (isDelivery) {
                    if (r.description?.toLowerCase().includes('milk')) typeLabel = 'Milk Delivery';
                    else if (r.description?.toLowerCase().includes('dahi')) typeLabel = 'Dahi Delivery';
                    else if (r.description?.toLowerCase().includes('paneer')) typeLabel = 'Paneer Delivery';
                    else if (r.description?.toLowerCase().includes('ghee')) typeLabel = 'Ghee Delivery';
                    else typeLabel = 'Product Delivery';
                  } else if (isPayment) {
                    typeLabel = 'Payment Received';
                  }

                  const rawBal = r.balance ?? 0;
                  const rowOutstanding = r.rawEntry?.outstandingBalance !== undefined
                    ? r.rawEntry.outstandingBalance
                    : Math.max(0, rawBal);
                  const rowCredit = r.rawEntry?.customerCredit !== undefined
                    ? r.rawEntry.customerCredit
                    : Math.max(0, -rawBal);
                  const rowCreditApplied = r.rawEntry?.creditApplied || 0;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPayment ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {r.index}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isDelivery ? (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                            <Truck className="w-3.5 h-3.5 text-slate-500" />
                            {typeLabel}
                          </span>
                        ) : isPayment ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#2E7D32]">
                            <IndianRupee className="w-3.5 h-3.5" />
                            Payment Received
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">{r.type}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-medium">
                        {r.description}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {r.referenceNumber || r.notes || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.debit > 0 ? formatCurrency(r.debit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#2E7D32] whitespace-nowrap">
                        {r.credit > 0 ? formatCurrency(r.credit) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-blue-700 whitespace-nowrap">
                        {rowCreditApplied > 0 ? formatCurrency(rowCreditApplied) : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black whitespace-nowrap">
                        <span className={rowOutstanding > 0 ? 'text-rose-700' : 'text-slate-400'}>
                          {formatCurrency(rowOutstanding)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black whitespace-nowrap">
                        <span className={rowCredit > 0 ? 'text-emerald-700' : 'text-slate-300'}>
                          {rowCredit > 0 ? formatCurrency(rowCredit) : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isPayment && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPaymentForView({
                                  id: r.id,
                                  amount: r.credit,
                                  payment_mode: r.paymentMode,
                                  payment_date: r.date,
                                  reference_number: r.referenceNumber,
                                  notes: r.notes,
                                  customer: currentCustomer,
                                })
                              }
                              className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                              title="View Payment Receipt"
                            >
                              <Receipt className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPaymentForEdit({
                                  id: r.id,
                                  amount: r.credit,
                                  payment_mode: r.paymentMode,
                                  payment_date: r.date,
                                  reference_number: r.referenceNumber,
                                  notes: r.notes,
                                  customer: currentCustomer,
                                })
                              }
                              className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                              title="Edit Payment"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePaymentConfirmId(r.id)}
                              className="p-1 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300 text-slate-800">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                    Period Totals & Live Account Balance:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                    {formatCurrency(
                      ledgerRows.reduce((sum: number, r: any) => sum + (r.debit || 0), 0)
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-[#2E7D32] whitespace-nowrap">
                    {formatCurrency(
                      ledgerRows.reduce((sum: number, r: any) => sum + (r.credit || 0), 0)
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700 whitespace-nowrap">
                    {formatCurrency(
                      ledgerRows.reduce((sum: number, r: any) => sum + (r.rawEntry?.creditApplied || 0), 0)
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-black text-sm whitespace-nowrap ${
                      currentOutstanding > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(currentOutstanding)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-700 whitespace-nowrap">
                    {customerCredit > 0 ? formatCurrency(customerCredit) : '—'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {currentCustomer && (
        <PaymentModal
          customer={currentCustomer}
          isOpen={paymentModalOpen}
          initialOutstanding={currentOutstanding}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            fetchStatement(selectedCustomerId, fromDate, toDate);
            loadCustomerAccounts();
          }}
        />
      )}

      {/* Refund Customer Advance Credit Modal */}
      {refundModalOpen && currentCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-100 bg-white/15 px-2 py-0.5 rounded-full">
                  Advance Credit Return
                </span>
                <h3 className="text-base font-bold mt-1 text-white">Refund Customer Advance</h3>
                <p className="text-xs text-blue-100 font-medium">
                  {currentCustomer.name} • {currentCustomer.mobile}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between text-xs font-semibold text-blue-950">
              <span>Available Customer Credit:</span>
              <span className="font-mono font-black text-sm text-blue-800">
                {formatCurrency(customerCredit)}
              </span>
            </div>

            <form onSubmit={handleRefundSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={customerCredit}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cannot exceed available advance of {formatCurrency(customerCredit)}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Refund Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash' },
                    { id: 'UPI', label: 'UPI' },
                    { id: 'BANK_TRANSFER', label: 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRefundPaymentMode(m.id as any)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        refundPaymentMode === m.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Excess payment returned on customer request"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingRefund ||
                    !refundAmount ||
                    Number(refundAmount) <= 0 ||
                    Number(refundAmount) > customerCredit
                  }
                  className="flex-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                >
                  {submittingRefund ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Delivery Modal */}
      {currentCustomer && (
        <DeliveryModal
          customer={currentCustomer}
          isOpen={deliveryModalOpen}
          onClose={() => setDeliveryModalOpen(false)}
          onSuccess={() => {
            fetchStatement(selectedCustomerId, fromDate, toDate);
            loadCustomerAccounts();
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {currentCustomer && (
        <EditCustomerModal
          customer={currentCustomer}
          isOpen={editCustomerModalOpen}
          onClose={() => setEditCustomerModalOpen(false)}
          onSuccess={() => {
            fetchStatement(selectedCustomerId, fromDate, toDate);
            loadCustomerAccounts();
          }}
        />
      )}

      {/* Payment Receipt / Detail Modal */}
      {selectedPaymentForView && (
        <PaymentDetailModal
          payment={selectedPaymentForView}
          isOpen={!!selectedPaymentForView}
          onClose={() => setSelectedPaymentForView(null)}
        />
      )}

      {/* Edit Payment Modal */}
      {selectedPaymentForEdit && (
        <EditPaymentModal
          payment={selectedPaymentForEdit}
          isOpen={!!selectedPaymentForEdit}
          onClose={() => setSelectedPaymentForEdit(null)}
          onSuccess={() => {
            fetchStatement(selectedCustomerId, fromDate, toDate);
            loadCustomerAccounts();
          }}
        />
      )}

      {/* Safe Delete Payment Confirmation Dialog */}
      {deletePaymentConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Delete Payment Record?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this payment? The customer outstanding balance will be
              automatically increased and reconciled.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePaymentConfirmId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingPayment}
                onClick={() => handleDeletePayment(deletePaymentConfirmId)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {deletingPayment ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Customer Confirmation Modal */}
      {deleteCustomerModalOpen && activeCustomerForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Delete Customer</h3>
            <p className="text-xs text-slate-700">
              Are you sure you want to delete this customer?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteCustomerModalOpen(false);
                  setActiveCustomerForAction(null);
                }}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingCustomer}
                onClick={handleDeleteCustomer}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {deletingCustomer ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
