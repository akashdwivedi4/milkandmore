import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Supplier, PaymentMethod } from '../types';
import {
  ArrowLeft,
  Users,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  TrendingDown,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';

export const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'UPI' as PaymentMethod,
    reference_number: '',
    notes: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [supRes, ledgerRes] = await Promise.all([
        api.getSupplierById(id),
        api.getSupplierLedger(id),
      ]);
      if (supRes.success) setSupplier(supRes.data);
      if (ledgerRes.success) setLedger(ledgerRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const num = parseFloat(paymentData.amount);
    if (isNaN(num) || num <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }

    try {
      setSavingPayment(true);
      const res = await api.createSupplierPayment({
        supplier_id: id,
        amount: num,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || undefined,
        notes: paymentData.notes || undefined,
      });

      if (res.success) {
        setIsPaymentModalOpen(false);
        setPaymentData({ amount: '', payment_method: 'UPI', reference_number: '', notes: '' });
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record supplier payment');
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Loading supplier ledger...</div>;
  }

  if (!supplier) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
        <p className="text-slate-600 font-medium">Supplier not found</p>
        <Link to="/suppliers" className="text-sm text-sky-500 font-semibold mt-2 inline-block">
          ← Back to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/suppliers"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </Link>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-sm text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment to Supplier
        </button>
      </div>

      {/* Supplier Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">
                ACTIVE VENDOR
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                {supplier.mobile}
              </div>
              {supplier.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {supplier.address}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-50 p-4 rounded-xl text-right">
              <span className="text-xs text-slate-400 font-semibold uppercase">Opening Payable</span>
              <p className="text-lg font-bold text-slate-700">₹{Number(supplier.opening_payable || 0).toFixed(2)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-right">
              <span className="text-xs text-amber-600 font-semibold uppercase">Current Payable</span>
              <p className="text-2xl font-bold text-amber-700">₹{Number(supplier.current_payable || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Purchases</span>
            <p className="text-xl font-bold text-slate-800 mt-1">₹{Number(ledger?.total_purchases || 0).toFixed(2)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-sky-400 bg-sky-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payments Paid</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">₹{Number(ledger?.total_payments || 0).toFixed(2)}</p>
          </div>
          <TrendingDown className="w-8 h-8 text-emerald-400 bg-emerald-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Amount Due</span>
            <p className="text-xl font-bold text-amber-600 mt-1">₹{Number(ledger?.current_payable || 0).toFixed(2)}</p>
          </div>
          <FileText className="w-8 h-8 text-amber-400 bg-amber-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-500" />
            Vendor Chronological Ledger
          </h3>
          <span className="text-xs text-slate-400">Formula: Opening + Purchases - Payments = Balance</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Reference</th>
                <th className="p-3.5">Transaction Details</th>
                <th className="p-3.5 text-right">Debit (Paid)</th>
                <th className="p-3.5 text-right">Credit (Added)</th>
                <th className="p-3.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ledger?.transactions?.map((tx: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5 text-slate-600 text-xs font-mono">{tx.date}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        tx.type === 'PURCHASE'
                          ? 'bg-sky-50 text-sky-700'
                          : tx.type === 'PAYMENT'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 text-xs font-mono">{tx.reference}</td>
                  <td className="p-3.5 font-medium text-slate-800">{tx.details}</td>
                  <td className="p-3.5 text-right font-semibold text-emerald-600">
                    {tx.debit > 0 ? `₹${Number(tx.debit).toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3.5 text-right font-semibold text-rose-600">
                    {tx.credit > 0 ? `₹${Number(tx.credit).toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    ₹{Number(tx.running_balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Payment to {supplier.name}</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="e.g. 1000.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value as PaymentMethod })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer / IMPS</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Transaction / Reference ID
                </label>
                <input
                  type="text"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  placeholder="e.g. UPI-9281726354"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="e.g. Weekly settlement payment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {savingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
