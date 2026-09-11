import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, Product, CustomerRateItem } from '../types';
import { formatCurrency } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import {
  Percent,
  Search,
  Check,
  ArrowLeft,
  Loader2,
  Users,
} from 'lucide-react';

export const CustomerRates: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const preselectedCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [rates, setRates] = useState<CustomerRateItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Editable custom rate input state
  const [rateInputs, setRateInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);
        const res = await api.getCustomers({ limit: 100 });
        if (res.success && res.data.length > 0) {
          setCustomers(res.data);
          if (!selectedCustomerId) {
            setSelectedCustomerId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  const loadRates = async (customerId: string) => {
    if (!customerId) return;
    try {
      setLoadingRates(true);
      const res = await api.getCustomerRates(customerId);
      if (res.success) {
        setRates(res.data);
        const inputs: Record<string, number> = {};
        res.data.forEach((r) => {
          inputs[r.product_id] = r.custom_rate !== null ? r.custom_rate : r.default_rate;
        });
        setRateInputs(inputs);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load rates', 'error');
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadRates(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleSaveRate = async (productId: string) => {
    const newRate = rateInputs[productId];
    if (newRate === undefined || newRate < 0) {
      showToast('Rate must be a non-negative number', 'error');
      return;
    }

    try {
      setSavingProductId(productId);
      const res = await api.setCustomerRate({
        customer_id: selectedCustomerId,
        product_id: productId,
        custom_rate: newRate,
      });

      if (res.success) {
        showToast('Custom customer rate updated successfully!', 'success');
        loadRates(selectedCustomerId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer rate', 'error');
    } finally {
      setSavingProductId(null);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/products')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer-Specific Rates Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Override product default prices for special subscriber agreements
          </p>
        </div>
      </div>

      {/* Customer Selector Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Select Customer
        </label>
        {loadingCustomers ? (
          <div className="text-xs text-slate-400">Loading customer list...</div>
        ) : (
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.mobile})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Rates Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Rates for {selectedCustomer?.name || 'Customer'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Auto-applies when QR is scanned</span>
        </div>

        {loadingRates ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
            <p className="text-xs font-semibold">Loading rates...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rates.map((item) => (
              <div
                key={item.product_id}
                className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{item.product_name}</h4>
                    {item.is_custom ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Custom Rate Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Default Rate
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Product Default: <strong className="text-slate-700">{formatCurrency(item.default_rate)}</strong> /{item.base_unit}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={rateInputs[item.product_id] ?? ''}
                      onChange={(e) =>
                        setRateInputs({
                          ...rateInputs,
                          [item.product_id]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-28 pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveRate(item.product_id)}
                    disabled={savingProductId === item.product_id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {savingProductId === item.product_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
