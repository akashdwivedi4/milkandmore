import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Building2, IndianRupee, MapPin, Phone, User, CheckCircle2 } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { business, completeOnboarding } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    businessName: business?.name || '',
    ownerName: business?.ownerName || '',
    mobile: business?.mobile || '',
    address: business?.address || '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    openingCash: 0,
    openingUpi: 0,
    openingBank: 0,
  });

  const [loading, setLoading] = useState(false);

  // If business setup is already completed, do not show onboarding
  if (!business || business.setupCompleted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.mobile) {
      showToast('Please provide your business name and mobile number.', 'error');
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding(formData);
      showToast('Dairy business setup completed successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save business setup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8 border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-3 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome to Milk & More!</h2>
          <p className="text-slate-500 text-sm mt-1">
            Let's configure your dairy delivery business settings and opening balances.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Business / Dairy Farm Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="e.g. Krishna Dairy Farm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Owner Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Mobile *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="10-digit mobile"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Dairy Address / Center
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Locality, City, State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Timezone
              </label>
              <input
                type="text"
                disabled
                value={formData.timezone}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Currency
              </label>
              <input
                type="text"
                disabled
                value={formData.currency}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Opening Financial Balances (₹)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Opening Cash</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.openingCash}
                    onChange={(e) => setFormData({ ...formData, openingCash: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Opening UPI</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.openingUpi}
                    onChange={(e) => setFormData({ ...formData, openingUpi: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Opening Bank</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.openingBank}
                    onChange={(e) => setFormData({ ...formData, openingBank: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Saving Setup...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Complete Setup & Start</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
