import React, { useState } from 'react';
import { Customer, PaymentMethod } from '../types';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { X, CheckCircle, Loader2, IndianRupee } from 'lucide-react';

interface PaymentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const idempotencyKey = `pay_${customer.id}_${Date.now()}`;
      const res = await api.createPayment(
        {
          customer_id: customer.id,
          amount,
          payment_method: paymentMethod,
          notes,
        },
        idempotencyKey
      );

      if (res.success) {
        showToast(`Payment of ${formatCurrency(amount)} recorded! Outstanding decreased.`, 'success');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-teal-100 bg-teal-700/40 px-2 py-0.5 rounded-full">
              Add Payment
            </span>
            <h2 className="text-lg font-bold mt-1">{customer.name}</h2>
            <p className="text-xs text-teal-100">Record customer cash/UPI payment collection</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Amount input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Payment Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 500"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['UPI', 'Cash', 'Bank', 'Other'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    paymentMethod === m
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Google Pay / Cash received by Ramesh"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
