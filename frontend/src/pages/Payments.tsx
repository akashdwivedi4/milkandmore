import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Payment, Customer } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import {
  Receipt,
  Plus,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';

export const Payments: React.FC = () => {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, custRes] = await Promise.all([
        api.getPayments(),
        api.getCustomers({ limit: 100 }),
      ]);

      if (payRes.success) setPayments(payRes.data);
      if (custRes.success) setCustomers(custRes.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Payments & Collections
          </h2>
          <p className="text-xs text-slate-500">
            Cash, UPI, and bank transfer receipts linked to customer ledger
          </p>
        </div>

        {customers.length > 0 && (
          <button
            onClick={() => setSelectedCustomer(customers[0])}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        )}
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
            <p className="text-xs font-semibold">Loading payment transactions...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-700">No payments recorded yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Click Add Payment to log customer payments.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {p.customer?.name || 'Customer'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {p.payment_method}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                    <span>{p.customer?.mobile}</span>
                    <span>•</span>
                    <span>{formatDateTime(p.paid_at)}</span>
                  </div>

                  {p.notes && (
                    <p className="text-xs text-slate-400 italic">"{p.notes}"</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 block leading-none">
                    - {formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400">Credited to Balance</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedCustomer && (
        <PaymentModal
          customer={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
