import React, { useState } from 'react';
import { Customer, PaymentMethod } from '../types';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { X, CheckCircle, Loader2, IndianRupee, Calendar, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: any) => void;
  initialOutstanding?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
  initialOutstanding,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentOutstanding =
    initialOutstanding ?? customer.summary?.currentOutstanding ?? customer.opening_balance ?? 0;

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
          payment_date: paymentDate,
          paid_at: paymentDate,
          reference_number: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        idempotencyKey
      );

      if (res.success) {
        showToast(
          `Payment of ${formatCurrency(amount)} recorded successfully! Outstanding balance updated.`,
          'success'
        );
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
        {/* Header */}
        <div className="bg-[#6B1724] p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-200 bg-white/10 px-2 py-0.5 rounded-full">
              Record Customer Payment
            </span>
            <h2 className="text-base font-bold mt-1 text-white">{customer.name}</h2>
            <p className="text-xs text-rose-200/90 font-mono">{customer.mobile}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Outstanding Balance Display (Section 14 requirement) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`w-4 h-4 ${currentOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Current Outstanding Balance:
            </span>
          </div>
          <span
            className={`text-sm font-black font-mono px-2.5 py-0.5 rounded-md ${
              currentOutstanding > 0
                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
          >
            {formatCurrency(currentOutstanding)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          {/* Payment Date & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Payment Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'UPI', label: 'UPI' },
                { id: 'CASH', label: 'Cash' },
                { id: 'BANK_TRANSFER', label: 'Bank' },
                { id: 'OTHER', label: 'Other' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    paymentMethod === m.id
                      ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reference Number / UTR (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI Ref / Cheque No / Txn ID"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via Google Pay by Ramesh"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            />
          </div>

          {/* Expected Balance & Credit Allocation Preview */}
          {amount > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <span>Payment to Clear Outstanding:</span>
                <span className="font-bold font-mono">
                  {formatCurrency(Math.min(Math.max(0, currentOutstanding), amount))}
                </span>
              </div>

              {amount > Math.max(0, currentOutstanding) && (
                <div className="flex items-center justify-between text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                  <span className="font-semibold">Customer Credit / Advance Held:</span>
                  <span className="font-black font-mono">
                    +{formatCurrency(amount - Math.max(0, currentOutstanding))}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Remaining Outstanding Balance:</span>
                <span className="font-mono font-black text-[#2E7D32]">
                  {formatCurrency(Math.max(0, currentOutstanding - amount))}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="flex-2 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#256629] active:bg-[#1E5221] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Save Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
