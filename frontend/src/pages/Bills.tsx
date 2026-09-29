import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, CustomerBillStatement } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { numberToIndianWords } from '../utils/numberToWords';
import { calculateInvoiceTotals } from '../utils/billing';
export { calculateInvoiceTotals };
import QRCode from 'qrcode';
import { useToast } from '../contexts/ToastContext';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import {
  Printer,
  FileText,
  Calendar,
  IndianRupee,
  Search,
  Milk,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Share2,
  QrCode,
  UserPlus,
  User,
  Edit2,
  Trash2,
  X,
  Receipt,
} from 'lucide-react';

export const Bills: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const preselectedCustId = searchParams.get('customerId');
  const preselectedStartDate = searchParams.get('startDate') || searchParams.get('from');
  const preselectedEndDate = searchParams.get('endDate') || searchParams.get('to');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustId || '');
  const [startDate, setStartDate] = useState<string>(preselectedStartDate || '');
  const [endDate, setEndDate] = useState<string>(preselectedEndDate || '');
  const [statement, setStatement] = useState<CustomerBillStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerModalOpen, setDeleteCustomerModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const res = await api.getCustomers({ limit: 200 });
        if (res.success && res.data && res.data.length > 0) {
          setCustomers(res.data);
          if (!selectedCustomerId) {
            setSelectedCustomerId(res.data[0].id);
          }
        } else {
          setCustomers([]);
        }
      } catch (err: any) {
        console.error('Failed to load customers:', err);
        showToast(err.message || 'Failed to load customers', 'error');
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  const generateBill = async (cId: string, sDate?: string, eDate?: string) => {
    if (!cId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getStatement(cId, sDate || undefined, eDate || undefined);
      if (res.success && res.data) {
        setStatement(res.data);
      } else {
        setStatement(null);
        setErrorMessage('Failed to generate statement for selected customer.');
      }
    } catch (err: any) {
      console.error('Bill statement generation error:', err);
      setErrorMessage(err.message || 'Failed to generate statement');
      showToast(err.message || 'Failed to generate statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      generateBill(selectedCustomerId, startDate, endDate);
    }
  }, [selectedCustomerId, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  // Safe item extraction
  const items = statement?.items || [];
  const payments = statement?.payments || [];
  const business = statement?.business;
  const customer = statement?.customer;
  const summary = statement?.summary;

  const activeCustomer: Customer | null = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || (customer as Customer | undefined) || null;
  }, [customers, selectedCustomerId, customer]);

  const handleEditCustomerSuccess = (updated: Customer) => {
    setEditingCustomer(null);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    showToast('Customer updated successfully', 'success');
    if (selectedCustomerId === updated.id) {
      generateBill(updated.id, startDate, endDate);
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!activeCustomer) return;
    try {
      setDeletingCustomer(true);
      const res = await api.deleteCustomer(activeCustomer.id);
      if (res.success) {
        showToast('Customer deleted successfully.', 'success');
        setDeleteCustomerModalOpen(false);
        const remaining = customers.filter((c) => c.id !== activeCustomer.id);
        setCustomers(remaining);
        if (remaining.length > 0) {
          setSelectedCustomerId(remaining[0].id);
        } else {
          setSelectedCustomerId('');
          setStatement(null);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
      setDeleteCustomerModalOpen(false);
    } finally {
      setDeletingCustomer(false);
    }
  };

  const todayDropsCount = summary?.todayDropsCount ?? summary?.todayDrops?.count ?? 0;
  const todayDeliveryAmount = summary?.todayDeliveryAmount ?? summary?.todayDrops?.amount ?? 0;
  const totalDeliveriesCount = summary?.totalDeliveriesCount ?? summary?.totalDeliveries?.count ?? items.length;
  const periodDeliveryAmount = summary?.periodDeliveryAmount ?? statement?.totalDeliveryCharges ?? 0;
  const totalPaymentsCount = summary?.totalPaymentsCount ?? payments.length;
  const periodPaymentsAmount = summary?.periodPaymentsAmount ?? statement?.totalCustomerPayments ?? 0;
  const previousBalance = summary?.previousBalance ?? 0;
  const openingBalance = customer?.openingBalance ?? statement?.openingBalance ?? 0;
  const finalOutstanding = summary?.finalOutstanding ?? summary?.amountDue ?? statement?.currentOutstanding ?? 0;
  const customerCredit = summary?.customerCredit ?? (statement as any)?.customerCreditRemaining ?? 0;

  // Derived calculations for professional invoice
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const {
    subTotal: subTotalAmount,
    previousBalance: previousBalanceAmount,
    totalPayable: totalPayableAmount,
    received: receivedAmount,
    balanceOutstanding: balanceOutstandingAmount,
    amountInWordsTarget,
    paymentStatus,
  } = calculateInvoiceTotals({
    subTotal: periodDeliveryAmount,
    previousBalance,
    received: periodPaymentsAmount,
  });

  const paymentMode = periodPaymentsAmount > 0
    ? (payments[0]?.paymentMethod || 'Cash')
    : (balanceOutstandingAmount > 0 ? 'Credit / Due' : 'Settled');

  const handleShareWhatsApp = () => {
    if (!statement || !customer) return;
    const phone = customer.mobile ? customer.mobile.replace(/\D/g, '') : '';
    const text =
      `*Bill Statement - ${business?.name || 'Milk & More'}*\n\n` +
      `Customer: ${customer.name}\n` +
      `Period: ${statement.period?.label || 'All Time'}\n` +
      `Sub Total: ₹${subTotalAmount.toFixed(2)}\n` +
      (previousBalanceAmount !== 0 ? `Previous Balance: ₹${previousBalanceAmount.toFixed(2)}\n` : '') +
      `Total Payable: ₹${totalPayableAmount.toFixed(2)}\n` +
      `Received: ₹${receivedAmount.toFixed(2)}\n` +
      `*Balance / Outstanding: ₹${balanceOutstandingAmount.toFixed(2)}*\n` +
      `Payment Status: ${paymentStatus}\n\n` +
      `Thank you for your business!`;
    const encoded = encodeURIComponent(text);
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (business?.upiId) {
      const payAmount = balanceOutstandingAmount > 0
        ? balanceOutstandingAmount.toFixed(2)
        : totalPayableAmount > 0
        ? totalPayableAmount.toFixed(2)
        : '';
      const payeeName = business.name || 'Milk and More';
      const upiUri = `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(payeeName)}${payAmount ? `&am=${payAmount}` : ''}&cu=INR`;
      QRCode.toDataURL(upiUri, { width: 140, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error('Error generating UPI QR code:', err);
          setQrCodeDataUrl('');
        });
    } else {
      setQrCodeDataUrl('');
    }
  }, [business?.upiId, business?.name, balanceOutstandingAmount, totalPayableAmount]);

  return (
    <div className="space-y-6">
      {/* Controls Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Monthly Bills & Customer Statements
          </h2>
          <p className="text-xs text-slate-500">
            Generate and print formal A4 itemized bills with previous balance and payments
          </p>
        </div>

        {customers.length > 0 && statement && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0"
              title="Send bill summary to customer on WhatsApp"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" focusable="false" />
              WhatsApp Bill
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" aria-hidden="true" focusable="false" />
              Print / Save PDF (A4)
            </button>
          </div>
        )}
      </div>

      {/* Filter Card (hidden in print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer
            </label>
            <div className="flex items-center gap-2">
              {activeCustomer && (
                <>
                  <Link
                    to={`/accounts?customerId=${activeCustomer.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6B1724] hover:underline"
                    title="Open Customer Account & Ledger"
                  >
                    <Receipt className="w-3 h-3" aria-hidden="true" focusable="false" />
                    Account
                  </Link>
                  <Link
                    to={`/customers/${activeCustomer.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-brand-600"
                    title="View Customer Details"
                  >
                    <User className="w-3 h-3" aria-hidden="true" focusable="false" />
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(activeCustomer)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-brand-600"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3 h-3" aria-hidden="true" focusable="false" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" focusable="false" />
                    Delete
                  </button>
                  <span className="text-slate-300">|</span>
                </>
              )}
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                title="Add New Customer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                Add
              </button>
            </div>
          </div>

          {loadingCustomers ? (
            <div className="flex items-center gap-2 py-2 px-3 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-2 px-3 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No customers found
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" focusable="false" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Filter by name or mobile..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {filteredCustomers.length === 0 ? (
                  <option value="" disabled>
                    No customers match "{customerSearch}"
                  </option>
                ) : (
                  filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile}) {c.address ? `• ${c.address}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            From Date (Optional)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            To Date (Optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 6 Summary Cards (hidden in print) */}
      {!loading && statement && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          {/* Card 1: Today's Drops */}
          <div
            data-testid="card-todays-drops"
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Today's Drops
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Milk className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 tracking-tight">
                <span className="metric-count">{todayDropsCount}</span> <span className="text-xs font-semibold text-slate-500">Drops</span>
              </div>
              <div className="text-xs font-bold text-blue-600 mt-0.5">
                <span className="metric-amount">{formatCurrency(todayDeliveryAmount)}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Today's calendar drops
            </div>
          </div>

          {/* Card 2: Total Deliveries */}
          <div
            data-testid="card-total-deliveries"
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Deliveries
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-slate-900 tracking-tight">
                <span className="metric-count">{totalDeliveriesCount}</span> <span className="text-xs font-semibold text-slate-500">Deliveries</span>
              </div>
              <div className="text-xs font-bold text-indigo-600 mt-0.5">
                <span className="metric-amount">{formatCurrency(periodDeliveryAmount)}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Selected period total
            </div>
          </div>

          {/* Card 3: Total Payments */}
          <div
            data-testid="card-total-payments"
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Payments
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-emerald-700 tracking-tight">
                <span className="metric-amount">{formatCurrency(periodPaymentsAmount)}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                <span className="metric-count">{totalPaymentsCount}</span> Payments received
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Period collections
            </div>
          </div>

          {/* Card 4: Previous Balance */}
          <div
            data-testid="card-previous-balance"
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Previous Balance
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-amber-700 tracking-tight">
                <span className="metric-amount">{formatCurrency(previousBalance)}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Before period / today
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Balance before period
            </div>
          </div>

          {/* Card 5: Opening Balance */}
          <div
            data-testid="card-opening-balance"
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Opening Balance
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-sky-700 tracking-tight">
                <span className="metric-amount">{formatCurrency(openingBalance)}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Initial signup balance
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Original opening dues
            </div>
          </div>

          {/* Card 6: Current Outstanding */}
          <div
            data-testid="card-current-outstanding"
            className={`bg-white p-4 rounded-2xl border ${
              balanceOutstandingAmount > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
            } shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Current Outstanding
              </span>
              <div
                className={`w-7 h-7 rounded-lg ${
                  balanceOutstandingAmount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                } flex items-center justify-center`}
              >
                <IndianRupee className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              </div>
            </div>
            <div>
              <div
                className={`text-lg font-black tracking-tight ${
                  balanceOutstandingAmount > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                <span className="metric-amount">{formatCurrency(balanceOutstandingAmount)}</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                Net balance due
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
              Live ledger balance
            </div>
          </div>
        </div>
      )}

      {/* Empty State: No Customers */}
      {!loadingCustomers && customers.length === 0 && (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Customers Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            You need to register at least one customer to generate and view delivery statements.
          </p>
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Add Your First Customer
          </Link>
        </div>
      )}

      {/* Error State */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => selectedCustomerId && generateBill(selectedCustomerId, startDate, endDate)}
            className="inline-flex items-center gap-1 font-bold text-rose-900 hover:underline shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-xs font-semibold">Generating statement...</p>
        </div>
      )}

      {/* A4 Printable Invoice Sheet */}
      {!loading && statement && (
        <div
          id="printable-statement"
          className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl mx-auto overflow-hidden print:shadow-none print:border print:border-slate-300 print:rounded-none print:p-0 print:m-0 print:max-w-none text-slate-800"
        >
          {/* Professional Business Header - Deep Maroon */}
          <div className="bg-[#6B1724] text-white p-6 sm:p-8 print:p-6 print:bg-[#6B1724] print:text-white">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              {/* Left: Business Info */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-serif">
                  {business?.name || 'MILK & MORE DAIRY'}
                </h1>
                <p className="text-xs text-rose-100/90 font-medium italic">
                  {business?.tagline || 'Pure Milk & Fresh Dairy Deliveries'}
                </p>
                <div className="text-[11px] text-rose-100/80 space-y-0.5 pt-1.5 leading-relaxed">
                  {business?.address && <p>{business.address}</p>}
                  <p>
                    {(business?.phone || business?.mobile) && (
                      <span>Phone: <strong className="text-white font-semibold">{business?.phone || business?.mobile}</strong></span>
                    )}
                    {business?.email && <span className="ml-3">Email: <strong className="text-white font-semibold">{business.email}</strong></span>}
                  </p>
                  <p>
                    <span>State: <strong className="text-white font-semibold">{business?.state || 'Rajasthan'}</strong></span>
                    {business?.gstNumber && <span className="ml-3">GSTIN: <strong className="text-white font-semibold">{business.gstNumber}</strong></span>}
                  </p>
                </div>
              </div>

              {/* Right: Boxed Logo & Tax Invoice Badge */}
              <div className="flex flex-col items-end gap-2.5 shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl flex items-center justify-center p-2 shadow-md">
                  {business?.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business?.name || 'Dairy Logo'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 bg-slate-50 rounded-lg">
                      <Milk className="w-8 h-8 text-[#6B1724]" />
                      <span className="text-[9px] font-black uppercase text-slate-800 tracking-tighter mt-1">Milk & More</span>
                    </div>
                  )}
                </div>
                <span className="inline-block bg-[#2E7D32] text-white text-[11px] font-black uppercase tracking-widest px-3.5 py-1 rounded-md shadow-xs">
                  TAX INVOICE
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 print:p-6 space-y-5 bg-white">
            {/* Bill To & Invoice Details Split Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 text-xs border-b border-slate-200">
              {/* Bill To */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Bill To
                </span>
                <p className="text-base font-black text-slate-900">
                  {customer?.name || 'Customer'}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Contact No:</span> {customer?.mobile || '-'}
                </p>
                {customer?.address && (
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Address:</span> {customer.address}
                  </p>
                )}
                {customer?.id && (
                  <p className="text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-700">Customer ID:</span> #{customer.id.slice(-6).toUpperCase()}
                  </p>
                )}
              </div>

              {/* Invoice Details */}
              <div className="sm:text-right space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Invoice Details
                </span>
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-700">Invoice No:</span>{' '}
                  <strong className="text-[#6B1724] font-black">
                    INV-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-{customer?.id ? customer.id.slice(-4).toUpperCase() : '001'}
                  </strong>
                </p>
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-700">Date:</span>{' '}
                  {formatDate(statement.generatedAt || new Date().toISOString())}
                </p>
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-700">Time:</span>{' '}
                  {new Date(statement.generatedAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-700">Period:</span>{' '}
                  <strong className="text-slate-900 font-bold">{statement.period?.label || 'All Time'}</strong>
                </p>
              </div>
            </div>

            {/* Itemized Deliveries Table */}
            <div className="my-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-10">#</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Item Name</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Quantity</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">Unit</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Price/ Unit</th>
                      <th className="py-2.5 px-3 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-slate-400 italic">
                          No deliveries recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs">
                                {item.productName}
                              </div>
                              <div className="text-[11px] font-normal text-slate-500 flex items-center gap-1.5">
                                <span>
                                  {formatDate(item.date)} • {item.shift === 'EVENING' ? 'Evening' : 'Morning'}
                                </span>
                                {item.isAdditional && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    Extra Drop
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 font-semibold text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-600">
                            {item.unit || 'L'}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 text-slate-700">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-b-2 border-slate-300 bg-slate-50 font-bold text-slate-900 text-xs">
                      <td colSpan={2} className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200">
                        Total
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 border-r border-slate-200">
                        {totalQuantity % 1 === 0 ? totalQuantity : totalQuantity.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200"></td>
                      <td className="py-2.5 px-3 border-r border-slate-200"></td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatCurrency(periodDeliveryAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payments Received Table */}
            {payments.length > 0 && (
              <div className="my-4 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32] mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                  Payments Received in Period
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-1.5 px-3 border-r border-slate-200">Payment Date</th>
                        <th className="py-1.5 px-3 border-r border-slate-200">Method</th>
                        <th className="py-1.5 px-3 border-r border-slate-200">Reference / Notes</th>
                        <th className="py-1.5 px-3 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                            {formatDate(p.paymentDate || p.paidAt)}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-[#2E7D32] uppercase text-[10px] border-r border-slate-200">
                            {p.paymentMethod || 'CASH'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-500 text-[11px] border-r border-slate-200">
                            {p.notes || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-[#2E7D32]">
                            - {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lower Section: Words, Terms, UPI QR & Financial Summary + Signatory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 pt-4 border-t border-slate-200">
              {/* Left Column: Words, Terms, UPI */}
              <div className="space-y-4">
                {/* Invoice Amount in Words */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Invoice Amount In Words:
                  </span>
                  <p className="text-xs font-bold text-slate-800 italic mt-0.5 capitalize">
                    {numberToIndianWords(amountInWordsTarget)}
                  </p>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Terms And Conditions:
                  </span>
                  <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                    {business?.termsAndConditions || '1. Goods once sold will not be taken back or exchanged.\n2. Please clear bill dues within the specified cycle.'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium italic pt-1">
                    Thank you for doing business with us.
                  </p>
                </div>

                {/* UPI QR Code & Scan to Pay */}
                {business?.upiId && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 max-w-sm">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI QR Code"
                        className="w-24 h-24 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <QrCode className="w-8 h-8 text-slate-400" aria-hidden="true" focusable="false" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="inline-block bg-[#2E7D32] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                        UPI Scan to Pay
                      </span>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Scan with GPay, PhonePe, Paytm, or BHIM
                      </p>
                      <p className="text-[11px] font-mono font-bold text-slate-800 break-all">
                        {business.upiId}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Financial Summary Box & Authorized Signatory */}
              <div className="flex flex-col justify-between items-end">
                {/* Financial Summary Table */}
                <div className="w-full sm:w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span className="font-medium">Sub Total:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(subTotalAmount)}</span>
                  </div>
                  {previousBalanceAmount !== 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span className="font-medium">Previous Balance:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(previousBalanceAmount)}</span>
                    </div>
                  )}
                  {/* Highlighted Total Row in Deep Maroon */}
                  <div className="flex justify-between items-center bg-[#6B1724] text-white font-black px-3.5 py-2.5 rounded-lg shadow-xs my-1.5">
                    <span className="text-xs uppercase tracking-wider">Total Payable:</span>
                    <span className="text-base font-black">{formatCurrency(totalPayableAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span className="font-medium">Received:</span>
                    <span className="font-semibold text-[#2E7D32]">- {formatCurrency(receivedAmount)}</span>
                  </div>

                  {/* Balance Area (Strict No Negative Outstanding rule) */}
                  {balanceOutstandingAmount > 0 ? (
                    <div
                      data-testid="invoice-balance-outstanding"
                      className="flex justify-between items-center px-3.5 py-2.5 rounded-lg font-black text-xs bg-rose-50 border border-rose-200 text-rose-900 my-1"
                    >
                      <span className="uppercase tracking-wider">Balance / Outstanding:</span>
                      <span className="text-base font-black text-rose-700">{formatCurrency(balanceOutstandingAmount)}</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 my-1">
                      <div
                        data-testid="invoice-balance-outstanding"
                        className="flex justify-between items-center px-3.5 py-2 rounded-lg font-bold text-xs bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <span className="uppercase tracking-wider">Balance / Outstanding:</span>
                        <span className="text-sm font-black text-slate-800">{formatCurrency(0)}</span>
                      </div>
                      {customerCredit > 0 && (
                        <div
                          data-testid="invoice-customer-credit"
                          className="flex justify-between items-center px-3.5 py-2 rounded-lg font-bold text-xs bg-emerald-50 border border-emerald-300 text-emerald-900"
                        >
                          <span className="uppercase tracking-wider flex items-center gap-1.5 text-[#2E7D32]">
                            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                            Advance / Customer Credit:
                          </span>
                          <span className="text-base font-black text-[#2E7D32]">{formatCurrency(customerCredit)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between py-1 text-[11px] text-slate-500">
                    <span>Payment Status:</span>
                    <span
                      data-testid="invoice-payment-status"
                      className={`font-bold ${
                        paymentStatus === 'Due'
                          ? 'text-red-700'
                          : paymentStatus === 'Partially Paid'
                          ? 'text-amber-700'
                          : 'text-[#2E7D32]'
                      }`}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Authorized Signatory Block */}
                <div className="mt-8 text-right space-y-1 w-full sm:w-72">
                  <p className="text-xs font-bold text-slate-800">
                    For: <span className="uppercase">{business?.name || 'Milk & More Dairy'}</span>
                  </p>
                  <div className="h-14 flex items-center justify-end">
                    {business?.signature ? (
                      <img
                        src={business.signature}
                        alt="Authorized Signature"
                        className="max-h-12 max-w-36 object-contain"
                      />
                    ) : (
                      <div className="h-10 w-36 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                        <span className="text-[10px] text-slate-400 italic">Signature</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 pt-0.5">
                    Authorized Signatory
                  </p>
                </div>
              </div>
            </div>

            {/* Statement Footer */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>
                Thank you for choosing <strong className="text-slate-600">{business?.name || 'Milk & More'}</strong>!
              </span>
              <span>
                {(business?.phone || business?.mobile) && `Helpline: ${business?.phone || business?.mobile}`}
                {business?.email && ` | Email: ${business.email}`}
              </span>
              <span className="font-medium text-slate-500">Page 1 of 1</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onSuccess={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setSelectedCustomerId(newCust.id);
          setAddCustomerOpen(false);
          showToast(`Customer '${newCust.name}' added successfully!`, 'success');
        }}
      />

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          isOpen={!!editingCustomer}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleEditCustomerSuccess}
        />
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteCustomerModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete Customer</h3>
                  <p className="text-[11px] text-slate-500">{activeCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Are you sure you want to delete this customer?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCustomerModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={deletingCustomer}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deletingCustomer ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
