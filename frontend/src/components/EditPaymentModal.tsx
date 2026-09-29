import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/format';
import { X, CheckCircle, Loader2 } from 'lucide-react';

interface EditPaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPayment: any) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount || 0);
      const d = (payment as any).payment_date || payment.paid_at || '';
      setPaymentDate(d ? d.split('T')[0] : new Date().toISOString().split('T')[0]);
      const mode = ((payment as any).payment_mode || payment.payment_method || 'UPI').toUpperCase();
      setPaymentMethod(
        ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'].includes(mode) ? (mode as any) : 'UPI'
      );
      setReferenceNumber(payment.reference_number || '');
      setNotes(payment.notes || '');
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Payment amount must be greater than 0', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.updatePayment(payment.id, {
        amount,
        payment_method: paymentMethod,
        paymentMode: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        showToast('Payment updated and customer balance reconciled successfully!', 'success');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
        <div className="bg-[#6B1724] p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-200 bg-white/10 px-2 py-0.5 rounded-full">
              Edit Payment Record
            </span>
            <h2 className="text-base font-bold mt-1 text-white">
              {payment.customer?.name || (payment as any).customer_name || 'Customer'}
            </h2>
            <p className="text-xs text-rose-200/90 font-mono">
              Receipt #{payment.id ? payment.id.slice(-8).toUpperCase() : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
                required
              />
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
                  className="w-full pl-6 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

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

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reference Number / UTR
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI Ref / Txn ID"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Updated note"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            />
          </div>

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
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
