import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Purchase, Product, Supplier, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Truck,
  Plus,
  Package,
  Calendar,
  IndianRupee,
  X,
  Loader2,
  Trash2,
  AlertCircle,
  Users,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState('L');
  const [rate, setRate] = useState<number>(48);
  const [paidAmount, setPaidAmount] = useState<number>(3000);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purRes, prodRes, supRes] = await Promise.all([
        api.getPurchases(),
        api.getProducts(),
        api.getSuppliers(),
      ]);

      if (purRes.success) setPurchases(purRes.data);
      if (prodRes.success && prodRes.data.length > 0) {
        setProducts(prodRes.data);
        if (!productId) {
          setProductId(prodRes.data[0].id);
          setUnit(prodRes.data[0].base_unit);
        }
      }
      if (supRes.success) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0 && !supplierId) {
          setSupplierId(supRes.data[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load purchases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) setUnit(prod.base_unit);
  };

  const calculatedTotal = Math.round(quantity * rate * 100) / 100;
  const calculatedBalance = Math.round((calculatedTotal - paidAmount) * 100) / 100;

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.mobile.includes(supplierSearch)
  );
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity <= 0 || rate < 0) {
      showToast('Please fill all required fields properly', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createPurchase({
        product_id: productId,
        supplier_id: supplierId || undefined,
        quantity,
        unit,
        purchase_cost: rate,
        paid_amount: paidAmount,
        payment_mode: paymentMode,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        showToast('Purchase recorded, inventory increased & supplier balance updated!', 'success');
        setIsModalOpen(false);
        setNotes('');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this purchase? Stock and supplier balance will be safely reconciled.')) return;
    try {
      const res = await api.deletePurchase(id);
      if (res.success) {
        showToast('Purchase deleted and stock reconciled', 'success');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete purchase', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-sky-500" />
            Purchases & Raw Milk Procurement
          </h1>
          <p className="text-sm text-slate-500">
            Record incoming milk stock, supplier payables, and upfront payments
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => {
              setIsModalOpen(true);
              setSupplierSearch('');
              setIsSupplierDropdownOpen(false);
            }}
            id="record-purchase-btn"
            data-testid="record-purchase-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            Record New Purchase
          </button>
        )}
      </div>

      {/* Purchases Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading procurement logs...</div>
      ) : purchases.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No purchases recorded yet</p>
          <p className="text-sm text-slate-400 mt-1">Record a purchase to add raw stock to inventory</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-4">Date</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Product</th>
                  <th className="p-4 text-right">Quantity</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-right">Paid (Mode)</th>
                  <th className="p-4 text-right">Balance Due</th>
                  {isOwnerOrAdmin && <th className="p-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchases.map((p) => {
                  const supplierName = p.supplier_rel?.name || p.supplier || 'Direct Vendor';
                  const total = p.total_amount || (p.quantity * p.purchase_cost);
                  const paid = p.paid_amount || 0;
                  const balance = p.balance_amount !== undefined ? p.balance_amount : total - paid;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {p.purchased_at ? p.purchased_at.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : '')}
                      </td>
                      <td className="p-4 font-medium text-slate-900">{supplierName}</td>
                      <td className="p-4">{p.product?.name || 'Milk Product'}</td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="p-4 text-right">₹{Number(p.purchase_cost).toFixed(2)}/{p.unit}</td>
                      <td className="p-4 text-right font-bold text-slate-900">₹{Number(total).toFixed(2)}</td>
                      <td className="p-4 text-right text-emerald-600 font-semibold">
                        ₹{Number(paid).toFixed(2)}{' '}
                        <span className="text-xs text-slate-400">({p.payment_mode || 'Cash'})</span>
                      </td>
                      <td className="p-4 text-right font-bold text-amber-600">
                        ₹{Number(balance).toFixed(2)}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete and Reconcile Stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Record Incoming Raw Milk / Purchase</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Select Product *
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.base_unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Supplier / Dairy *
                  </label>
                  <button
                    type="button"
                    id="purchase-supplier-select"
                    data-testid="purchase-supplier-select"
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <span className={selectedSupplier ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                      {selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.mobile})` : '-- Select or Search Supplier --'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {isSupplierDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1.5 animate-in fade-in duration-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          id="purchase-supplier-search"
                          data-testid="purchase-supplier-search"
                          autoFocus
                          value={supplierSearch}
                          onChange={(e) => setSupplierSearch(e.target.value)}
                          placeholder="Type to search supplier..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {filteredSuppliers.length === 0 ? (
                          <div data-testid="no-matching-supplier" className="p-2 text-center text-xs text-slate-400">
                            {suppliers.length === 0 ? 'No suppliers found' : 'No matching supplier found'}
                          </div>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <div
                              key={s.id}
                              id={`supplier-option-${s.id}`}
                              data-testid={`supplier-option-${s.id}`}
                              onClick={() => {
                                setSupplierId(s.id);
                                setIsSupplierDropdownOpen(false);
                                setSupplierSearch('');
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                supplierId === s.id ? 'bg-sky-50 text-sky-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div>
                                <span className="font-semibold">{s.name}</span>
                                <span className="text-slate-400 ml-1.5">({s.mobile})</span>
                              </div>
                              {supplierId === s.id && <Check className="w-3.5 h-3.5 text-sky-600" />}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback hidden select for form validation/accessibility */}
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <option value="">-- None --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="purchase-quantity-input" className="block text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                  <input
                    type="number"
                    id="purchase-quantity-input"
                    data-testid="purchase-quantity-input"
                    step="0.01"
                    min="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="purchase-unit-select" className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    id="purchase-unit-select"
                    data-testid="purchase-unit-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="L">Liters (L)</option>
                    <option value="ML">Milliliters (ML)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="Gram">Grams (g)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="purchase-rate-input" className="block text-xs font-semibold text-slate-600 mb-1">
                    Rate (₹/{unit}) *
                  </label>
                  <input
                    type="number"
                    id="purchase-rate-input"
                    data-testid="purchase-rate-input"
                    step="0.01"
                    min="0"
                    required
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Total Purchase Amount:</span>
                <span className="text-base font-bold text-sky-900">₹{calculatedTotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="purchase-paid-amount-input" className="block text-xs font-semibold text-slate-600 mb-1">
                    Upfront Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    id="purchase-paid-amount-input"
                    data-testid="purchase-paid-amount-input"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="purchase-payment-mode-select" className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <select
                    id="purchase-payment-mode-select"
                    data-testid="purchase-payment-mode-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span>Remaining Balance added to Supplier Payable:</span>
                <span className="font-bold text-amber-700">₹{calculatedBalance.toFixed(2)}</span>
              </div>

              <div>
                <label htmlFor="purchase-notes-input" className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  id="purchase-notes-input"
                  data-testid="purchase-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning batch, 6.5% fat"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-purchase-btn"
                  data-testid="save-purchase-btn"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Record Purchase'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
