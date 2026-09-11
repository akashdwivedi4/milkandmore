import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Business, UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Shield,
  Check,
  Plus,
  X,
  Loader2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { business, refreshMe, role } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  // Business profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [stateName, setStateName] = useState('');
  const [tagline, setTagline] = useState('');
  const [upiId, setUpiId] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [openingBank, setOpeningBank] = useState<number>(0);
  const [openingUpi, setOpeningUpi] = useState<number>(0);
  const [savingSettings, setSavingSettings] = useState(false);

  // Staff members state
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // New staff form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('MILKMAN');
  const [submittingStaff, setSubmittingStaff] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPhone(business.phone || business.mobile || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setGstNumber(business.gst_number || (business as any).gstNumber || '');
      setStateName(business.state || '');
      setTagline(business.tagline || '');
      setUpiId(business.upiId || business.upi_id || '');
      setTermsAndConditions(business.termsAndConditions || business.terms_and_conditions || '');
      setTimezone(business.timezone || 'Asia/Kolkata');
      setAllowNegativeStock(business.allow_negative_stock || false);
      setOpeningCash(Number(business.opening_cash || business.openingCash) || 0);
      setOpeningBank(Number(business.opening_bank || business.openingBank) || 0);
      setOpeningUpi(Number(business.opening_upi || business.openingUpi) || 0);
    }
  }, [business]);

  const loadStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await api.getStaff();
      if (res.success) setStaffList(res.data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSavingSettings(true);
      const res = await api.updateSettings({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        state: stateName.trim() || undefined,
        tagline: tagline.trim() || undefined,
        upi_id: upiId.trim() || undefined,
        terms_and_conditions: termsAndConditions.trim() || undefined,
        timezone,
        allow_negative_stock: allowNegativeStock,
        opening_cash: openingCash,
        opening_bank: openingBank,
        opening_upi: openingUpi,
      });

      if (res.success) {
        showToast('Business settings updated successfully!', 'success');
        refreshMe();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim()) return;

    try {
      setSubmittingStaff(true);
      const res = await api.addStaff({
        name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
      });

      if (res.success) {
        showToast('Staff member added successfully!', 'success');
        setIsStaffModalOpen(false);
        setStaffName('');
        setStaffEmail('');
        loadStaff();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add staff', 'error');
    } finally {
      setSubmittingStaff(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Business & Staff Settings
        </h2>
        <p className="text-xs text-slate-500">
          Branding, contact info, inventory preferences, and milkman delivery access
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Settings Form */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Dairy Business Profile & Branding
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dairy Business Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dairy@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dairy Physical Address (Printed on Invoices)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Station Road, Anand, Gujarat"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tagline / Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Fresh & Pure Farm Dairy Products"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  State / Region (Printed on Invoices)
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="23-Madhya Pradesh / Gujarat"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  GST / Tax Number (Optional)
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="24ABCDE1234F1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Business UPI ID (For Bill QR Code Payment)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi / okaxis / okhdfcbank"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Invoice Terms & Conditions
                </label>
                <input
                  type="text"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Thank you for doing business with us."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Local Business Timezone *
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - Indian Standard Time)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>
            </div>

            {/* Opening Liquid Balances */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">
                Opening Payment Account Balances (₹)
              </span>
              <p className="text-[11px] text-slate-500">
                Initial starting capital before using Milk & More. Does not get mixed with today's revenue.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Opening Cash (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Opening Bank Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBank}
                    onChange={(e) => setOpeningBank(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Opening UPI Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingUpi}
                    onChange={(e) => setOpeningUpi(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Negative Stock Toggle */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Allow Negative Stock Deliveries
                </span>
                <p className="text-[11px] text-slate-500 max-w-sm leading-tight mt-0.5">
                  When enabled, milkmen can record deliveries even if system inventory is 0.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>

            {isOwnerOrAdmin && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/25 transition-all"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Staff Members Panel */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Delivery Staff & Roles</h3>
            </div>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100"
                title="Add Staff"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingStaff ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{s.name}</h4>
                    <p className="text-[11px] text-slate-500">{s.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.role === 'OWNER'
                        ? 'bg-purple-100 text-purple-800'
                        : s.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-brand-600 to-sky-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Add Staff Member</h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Role Assignment *
                </label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="MILKMAN">MILKMAN (QR Scan, View Route, Add Deliveries)</option>
                  <option value="STAFF">STAFF (Route & Customer Management)</option>
                  <option value="ADMIN">ADMIN (Full management without business ownership transfer)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="flex-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25"
                >
                  {submittingStaff ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
