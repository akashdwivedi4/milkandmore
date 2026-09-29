import React from 'react';
import { Payment } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { numberToIndianWords } from '../utils/numberToWords';
import { X, Printer, CheckCircle2, Receipt } from 'lucide-react';

interface PaymentDetailModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
  businessPhone?: string;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  onClose,
  businessName = 'Milk & More Dairy',
  businessPhone,
}) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const amountInWords = numberToIndianWords(payment.amount || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
        {/* Header - Screen only */}
        <div className="bg-[#6B1724] p-4 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-300" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Payment Receipt & Details
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 space-y-4 bg-white text-slate-800 text-xs font-sans">
          {/* Business & Receipt Header */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight">{businessName}</h1>
              <p className="text-[11px] text-slate-600">Official Payment Collection Receipt</p>
              {businessPhone && (
                <p className="text-[11px] text-slate-500 font-mono">Helpline: {businessPhone}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 block mb-1">
                Receipt #{payment.id ? payment.id.slice(-8).toUpperCase() : 'RCPT'}
              </span>
              <p className="text-[11px] text-slate-600 font-mono">
                {formatDateTime(payment.paid_at || (payment as any).payment_date || payment.created_at)}
              </p>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Information
            </div>
            <div className="flex items-center justify-between">
              <div className="font-black text-sm text-slate-900">
                {payment.customer?.name || (payment as any).customer_name || 'Customer'}
              </div>
              <div className="font-mono font-bold text-slate-700">
                {payment.customer?.mobile || '—'}
              </div>
            </div>
            {payment.customer?.address && (
              <div className="text-slate-600 text-[11px]">{payment.customer.address}</div>
            )}
          </div>

          {/* Payment Particulars */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Payment Mode</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    Milk & Dairy Account Collection
                  </td>
                  <td className="py-3 px-3 font-bold text-[#2E7D32]">
                    {(payment as any).payment_mode || payment.payment_method || 'CASH'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Amount in Words:
            </span>
            <span className="font-bold text-slate-800 italic">{amountInWords}</span>
          </div>

          {/* Reference / Notes */}
          {(payment.reference_number || payment.notes) && (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              {payment.reference_number && (
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                    Reference / UTR
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {payment.reference_number}
                  </span>
                </div>
              )}
              {payment.notes && (
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                    Notes
                  </span>
                  <span className="text-slate-700 italic">{payment.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Signature & Timestamp */}
          <div className="pt-6 border-t border-dashed border-slate-300 flex items-end justify-between text-[11px] text-slate-500">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Payment Status</p>
              <span className="inline-flex items-center gap-1 font-bold text-[#2E7D32]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Collection
              </span>
            </div>
            <div className="text-right">
              <div className="w-28 border-b border-slate-400 mb-1"></div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer - Screen only */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
