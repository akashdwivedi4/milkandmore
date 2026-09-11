import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { X, UserPlus, Loader2, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
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

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  initialQrCode?: string;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialQrCode,
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
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [deliverySchedule, setDeliverySchedule] = useState<'MORNING' | 'EVENING' | 'BOTH'>('MORNING');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

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
      const res = await api.createCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        customer_since: customerSince,
        service_end_date: serviceEndDate ? serviceEndDate : null,
        ending_reason: endingReason.trim() || null,
        opening_balance: openingBalance || 0,
        delivery_schedule: deliverySchedule,
        assigned_qr: initialQrCode || undefined,
      });

      if (res.success) {
        showToast(
          initialQrCode
            ? `Customer added and QR ${initialQrCode} assigned!`
            : 'Customer added successfully!',
          'success'
        );
        onSuccess(res.data);
        onClose();
        setName('');
        setMobile('');
        setAddress('');
        setNotes('');
        setCustomerSince(today);
        setServiceEndDate('');
        setEndingReason('');
        setOpeningBalance(0);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Add New Customer</h2>
            <p className="text-xs text-sky-100">Configure customer details, service dates & QR</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Initial QR Badge if passed */}
          {initialQrCode && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-brand-700 tracking-wider">
                  Doorstep QR Card Scanned
                </p>
                <p className="text-xs font-mono font-bold text-slate-800">{initialQrCode}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                To Be Assigned
              </span>
            </div>
          )}

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="customer-name-input" className="text-xs font-semibold text-slate-700 block mb-1">
                Customer Full Name *
              </label>
              <input
                type="text"
                id="customer-name-input"
                data-testid="customer-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="customer-mobile-input" className="text-xs font-semibold text-slate-700 block mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                id="customer-mobile-input"
                data-testid="customer-mobile-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Delivery Schedule
            </label>
            <select
              value={deliverySchedule}
              onChange={(e) => setDeliverySchedule(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="MORNING">Morning Shift</option>
              <option value="EVENING">Evening Shift</option>
              <option value="BOTH">Both (Morning & Evening)</option>
            </select>
          </div>

          {/* Service Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
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
              <span className="text-[10px] text-slate-500 mt-0.5 block">Defaults to today, can backdate</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Service End Date (Optional)
              </label>
              <input
                type="date"
                value={serviceEndDate}
                min={customerSince}
                max={today}
                onChange={(e) => setServiceEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Leave empty for active customers</span>
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
                placeholder="e.g. Relocated to another city, paused temporarily"
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
              id="customer-address-input"
              data-testid="customer-address-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 204, Gokul Heights"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
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
              id="save-customer-btn"
              data-testid="save-customer-btn"
              disabled={submitting}
              className="flex-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/25 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Customer...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
