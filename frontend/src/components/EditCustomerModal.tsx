import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { X, Save, Loader2, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Customer } from '../types';

const getTodayKolkata = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: (updated: Customer) => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const today = getTodayKolkata();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSince, setCustomerSince] = useState(today);
  const [serviceEndDate, setServiceEndDate] = useState('');
  const [endingReason, setEndingReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setMobile(customer.mobile || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
      setCustomerSince(customer.customer_since ? customer.customer_since.slice(0, 10) : today);
      setServiceEndDate(customer.service_end_date ? customer.service_end_date.slice(0, 10) : '');
      setEndingReason(customer.ending_reason || '');
    }
  }, [customer, today]);

  if (!isOpen || !customer) return null;

  const isActive = !serviceEndDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      showToast('Name and mobile number are required', 'error');
      return;
    }

    if (!customerSince) {
      showToast('Customer Since date is required', 'error');
      return;
    }

    if (customerSince > today) {
      showToast('Customer Since date cannot be in the future', 'error');
      return;
    }

    if (serviceEndDate) {
      if (serviceEndDate > today) {
        showToast('Service End Date cannot be in the future', 'error');
        return;
      }
      if (serviceEndDate < customerSince) {
        showToast('Service End Date cannot be earlier than Customer Since date', 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await api.updateCustomer(customer.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim() || null,
        notes: notes.trim() || null,
        customer_since: customerSince,
        service_end_date: serviceEndDate ? serviceEndDate : null,
        ending_reason: serviceEndDate ? (endingReason.trim() || null) : null,
      });

      if (res.success) {
        showToast('Customer details updated successfully', 'success');
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Edit Customer</h2>
            <p className="text-xs text-sky-100">Update contact info, service lifecycle & notes</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status Indicator Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Calculated Status:</span>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                <AlertCircle className="w-3.5 h-3.5" /> Inactive
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mobile Number (10 digits) *
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Service Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                Customer Since *
              </label>
              <input
                type="date"
                value={customerSince}
                max={today}
                onChange={(e) => setCustomerSince(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Start date of delivery service</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Service End Date (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={serviceEndDate}
                  min={customerSince}
                  max={today}
                  onChange={(e) => setServiceEndDate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                {serviceEndDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setServiceEndDate('');
                      setEndingReason('');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"
                    title="Clear end date to reactivate"
                  >
                    Clear
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Clear to keep customer active</span>
            </div>
          </div>

          {/* Ending Reason if Service End Date is set */}
          {serviceEndDate && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ending Reason (Optional)
              </label>
              <input
                type="text"
                value={endingReason}
                onChange={(e) => setEndingReason(e.target.value)}
                placeholder="e.g. Relocated to another city, switched vendor"
                className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Delivery Address (Door / Flat / Society)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 204, Gokul Heights"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Delivery Notes / Timing Preference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning 6:30 AM / Ring bell twice"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

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
              className="flex-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/25 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
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
