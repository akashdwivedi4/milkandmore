import React, { useState, useEffect } from 'react';
import { Customer, Product, DeliveryItem, Delivery } from '../types';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Plus,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sun,
  Moon,
  Clock,
} from 'lucide-react';

interface DeliveryModalProps {
  customer: Customer;
  existingDelivery?: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (delivery: any) => void;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  customer,
  existingDelivery,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerRates, setCustomerRates] = useState<Record<string, number>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Inactive Customer Warning state
  const isCustomerInactive = !customer.active || !!customer.service_end_date;
  const [confirmedInactiveContinue, setConfirmedInactiveContinue] = useState(false);

  // Shift selection
  const computeInitialShift = (): 'MORNING' | 'EVENING' => {
    if (existingDelivery?.shift) return existingDelivery.shift as any;
    const sched = customer.deliverySchedule || (customer as any).delivery_schedule;
    if (sched === 'EVENING') return 'EVENING';
    if (new Date().getHours() >= 14) return 'EVENING';
    return 'MORNING';
  };

  const [shift, setShift] = useState<'MORNING' | 'EVENING'>(computeInitialShift);

  // Duplicate delivery tracking state
  const [todayDeliveries, setTodayDeliveries] = useState<any[]>([]);
  const [confirmedAddAnother, setConfirmedAddAnother] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // Items in current delivery
  const [items, setItems] = useState<DeliveryItem[]>([
    { product_id: '', quantity: 1, unit: 'L', rate: 0, amount: 0 },
  ]);
  const [notes, setNotes] = useState('');

  // 1. Fetch products & customer specific rates & today's deliveries
  useEffect(() => {
    if (!isOpen) return;

    setConfirmedInactiveContinue(false);
    setConfirmedAddAnother(false);
    setShowDuplicateDialog(false);
    setShift(computeInitialShift());

    const loadData = async () => {
      try {
        setLoadingProducts(true);
        const [prodRes, ratesRes, todayRes] = await Promise.all([
          api.getProducts(),
          api.getCustomerRates(customer.id),
          existingDelivery ? Promise.resolve({ success: true, data: { deliveries: [] } }) : api.checkTodayDelivery(customer.id),
        ]);

        if (prodRes.success && prodRes.data.length > 0) {
          setProducts(prodRes.data);

          const ratesMap: Record<string, number> = {};
          if (ratesRes.success) {
            ratesRes.data.forEach((r: any) => {
              ratesMap[r.product_id] = r.effective_rate;
            });
          }
          setCustomerRates(ratesMap);

          if (existingDelivery && existingDelivery.items && existingDelivery.items.length > 0) {
            setItems(
              existingDelivery.items.map((it) => ({
                product_id: it.product_id,
                quantity: it.quantity,
                unit: it.unit,
                rate: it.rate,
                amount: it.amount,
              }))
            );
            setNotes(existingDelivery.notes || '');
            if (existingDelivery.shift) {
              setShift(existingDelivery.shift as any);
            }
          } else {
            const firstProd = prodRes.data[0];
            const rate = ratesMap[firstProd.id] ?? firstProd.default_rate;
            setItems([
              {
                product_id: firstProd.id,
                quantity: 1,
                unit: firstProd.base_unit,
                rate,
                amount: rate * 1,
              },
            ]);
            setNotes('');
          }
        }

        if (todayRes && (todayRes as any).success && (todayRes as any).data) {
          setTodayDeliveries((todayRes as any).data.deliveries || []);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load products', 'error');
      } finally {
        setLoadingProducts(false);
      }
    };

    loadData();
  }, [isOpen, customer.id, existingDelivery]);

  // Check if current selected shift has an existing delivered drop today
  const existingDeliveriesForShift = todayDeliveries.filter(
    (d) => (d.shift || 'MORNING').toUpperCase() === shift.toUpperCase() && d.status === 'DELIVERED'
  );
  const isDuplicateForShift = !existingDelivery && existingDeliveriesForShift.length > 0;

  // Recalculate item amount
  const updateItem = (index: number, updates: Partial<DeliveryItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const curr = { ...next[index], ...updates };

      if (updates.product_id && updates.product_id !== next[index].product_id) {
        const prod = products.find((p) => p.id === updates.product_id);
        if (prod) {
          curr.unit = prod.base_unit;
          curr.rate = customerRates[prod.id] ?? prod.default_rate;
        }
      }

      const prod = products.find((p) => p.id === curr.product_id);
      const factor = prod?.supported_units?.find((u) => u.unit.toLowerCase() === curr.unit.toLowerCase())?.factor || 1.0;
      const baseUnits = curr.quantity * factor;
      curr.amount = Math.round(baseUnits * curr.rate * 100) / 100;

      next[index] = curr;
      return next;
    });
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    const prod = products[0];
    const rate = customerRates[prod.id] ?? prod.default_rate;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        quantity: 1,
        unit: prod.base_unit,
        rate,
        amount: rate * 1,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.amount || 0), 0);

  // Core delivery persistence execution
  const executeSave = async (isAdditionalDelivery: boolean) => {
    if (submitting) return;

    for (const it of items) {
      if (!it.product_id) {
        showToast('Please select a product for all items', 'error');
        return;
      }
      if (it.quantity <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const idempotencyKey = `deliv_${customer.id}_${Date.now()}_${Math.random()}`;

      if (existingDelivery) {
        const res = await api.editDelivery(
          existingDelivery.id,
          {
            items,
            notes,
            shift,
          },
          idempotencyKey
        );
        if (res.success) {
          showToast('Delivery updated successfully! Stock reconciled.', 'success');
          onSuccess(res.data);
          onClose();
        }
      } else {
        const res = await api.createDelivery(
          {
            customer_id: customer.id,
            customerId: customer.id,
            shift,
            items,
            notes,
            isAdditional: isAdditionalDelivery,
            is_additional: isAdditionalDelivery,
          },
          idempotencyKey
        );
        if (res.success) {
          showToast(
            isAdditionalDelivery
              ? 'Additional delivery saved successfully! Stock & ledger updated.'
              : 'Delivery saved successfully! Stock & ledger updated.',
            'success'
          );
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already recorded')) {
        // Soft prompt if backend reports duplicate
        setShowDuplicateDialog(true);
      } else {
        showToast(err.message || 'Failed to save delivery', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // If duplicate shift detected and user has not confirmed adding another drop, show confirmation dialog
    if (isDuplicateForShift && !confirmedAddAnother) {
      setShowDuplicateDialog(true);
      return;
    }

    await executeSave(confirmedAddAnother);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-sky-600 p-4 sm:p-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-sky-100 bg-sky-700/40 px-2 py-0.5 rounded-full">
              {existingDelivery ? 'Edit Delivery' : 'Record New Delivery'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold mt-1">{customer.name}</h2>
            <p className="text-xs text-sky-100">
              {customer.mobile} {customer.address ? `• ${customer.address}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            id="close-delivery-modal-btn"
            data-testid="close-delivery-modal-btn"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inactive Customer Warning Dialog */}
        {isCustomerInactive && !confirmedInactiveContinue && (
          <div className="p-5 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 text-base">This customer is inactive.</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Service ended on{' '}
                  {customer.service_end_date ? formatDate(customer.service_end_date) : 'a prior date'}.
                  {customer.ending_reason ? ` (Reason: ${customer.ending_reason})` : ''}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-amber-300 text-amber-900 font-semibold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedInactiveContinue(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-amber-600/20"
                  >
                    Continue Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Delivery Warning Banner / Dialog */}
        {showDuplicateDialog && (
          <div className="p-5 bg-amber-50 border-b-2 border-amber-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-950 text-base">
                  Today's delivery already recorded.
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  This customer already has a delivery recorded for{' '}
                  <strong>{shift === 'MORNING' ? 'Morning' : 'Evening'}</strong> today. Do you want to
                  add another delivery?
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowDuplicateDialog(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setConfirmedAddAnother(true);
                      setShowDuplicateDialog(false);
                      executeSave(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-600/20 flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Add Another Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        {(!isCustomerInactive || confirmedInactiveContinue) && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {loadingProducts ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-xs font-medium">Loading products and rates...</p>
              </div>
            ) : (
              <>
                {/* Shift Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Delivery Shift
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShift('MORNING');
                        setConfirmedAddAnother(false);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        shift === 'MORNING'
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-2 ring-amber-400/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      Morning Shift
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShift('EVENING');
                        setConfirmedAddAnother(false);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        shift === 'EVENING'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs ring-2 ring-indigo-400/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-indigo-500" />
                      Evening Shift
                    </button>
                  </div>
                </div>

                {/* Soft Notification if already delivered for shift */}
                {isDuplicateForShift && !confirmedAddAnother && !showDuplicateDialog && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {shift === 'MORNING' ? 'Morning' : 'Evening'} delivery already recorded today.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmedAddAnother(true)}
                      className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-bold text-[11px] rounded-lg text-amber-950 transition-colors shrink-0"
                    >
                      Add Extra Drop
                    </button>
                  </div>
                )}

                {confirmedAddAnother && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Confirmed: Recording additional delivery for {shift.toLowerCase()} today.</span>
                  </div>
                )}

                {/* Product Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Delivery Items
                    </label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Product
                    </button>
                  </div>

                  {items.map((item, index) => {
                    const selectedProd = products.find((p) => p.id === item.product_id);
                    const supportedUnits = selectedProd?.supported_units || [{ unit: 'L', factor: 1 }];

                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, { product_id: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.current_stock} {p.base_unit})
                              </option>
                            ))}
                          </select>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {/* Quantity */}
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                              required
                            />
                          </div>

                          {/* Unit */}
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Unit
                            </label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(index, { unit: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            >
                              {supportedUnits.map((u) => (
                                <option key={u.unit} value={u.unit}>
                                  {u.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Rate */}
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                              Rate (₹/{selectedProd?.base_unit || 'Unit'})
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={item.rate}
                              onChange={(e) => updateItem(index, { rate: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                          <span>
                            Item Total:{' '}
                            <strong className="text-slate-900 font-bold">{formatCurrency(item.amount)}</strong>
                          </span>
                          {customerRates[item.product_id] !== undefined && (
                            <span className="text-emerald-600 font-semibold">Custom Rate Active</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Delivery Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivered to door hook"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                {/* Total Bar */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3.5 rounded-xl text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Delivery Amount</span>
                    <p className="text-lg font-black text-white leading-none mt-0.5">{formatCurrency(totalAmount)}</p>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {items.length} item{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Submit button with double-tap protection */}
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
                    className="flex-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/25 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Delivery...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {existingDelivery ? 'Update Delivery' : confirmedAddAnother ? 'Save Additional Delivery' : 'Save Delivery'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
