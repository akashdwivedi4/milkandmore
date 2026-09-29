import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Purchase, PurchaseReturn, Product, Supplier, PaymentMethod } from '../types';
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
  RotateCcw,
} from 'lucide-react';

export const Purchases: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'purchases' | 'returns'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase Modal State
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

  // Purchase Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState<number>(5);
  const [returnRate, setReturnRate] = useState<number>(45);
  const [returnUnit, setReturnUnit] = useState('L');
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purRes, prodRes, supRes, retRes] = await Promise.all([
        api.getPurchases(),
        api.getProducts(),
        api.getSuppliers(),
        api.getPurchaseReturns(),
      ]);

      if (purRes.success) setPurchases(purRes.data);
      if (retRes.success) setReturns(retRes.data);
      if (prodRes.success && prodRes.data.length > 0) {
        setProducts(prodRes.data);
        if (!productId) {
          setProductId(prodRes.data[0].id);
          setUnit(prodRes.data[0].base_unit);
        }
        if (!returnProductId) {
          setReturnProductId(prodRes.data[0].id);
          setReturnUnit(prodRes.data[0].base_unit);
        }
      }
      if (supRes.success) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) {
          if (!supplierId) setSupplierId(supRes.data[0].id);
          if (!returnSupplierId) setReturnSupplierId(supRes.data[0].id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load purchases data', 'error');
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

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSupplierId || !returnProductId || returnQuantity <= 0 || returnRate <= 0) {
      showToast('Please fill all required return fields properly', 'error');
      return;
    }

    try {
      setSubmittingReturn(true);
      const res = await api.createPurchaseReturn({
        supplierId: returnSupplierId,
        returnDate: new Date().toISOString().split('T')[0],
        reason: returnReason.trim() || undefined,
        items: [
          {
            productId: returnProductId,
            quantity: returnQuantity,
            unit: returnUnit,
            rate: returnRate,
          },
        ],
      });

      if (res.success) {
        showToast('Purchase return recorded, stock reduced, and supplier payable adjusted!', 'success');
        setIsReturnModalOpen(false);
        setReturnReason('');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record purchase return', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase? Stock and supplier balance will be adjusted.')) {
      return;
    }
    try {
      const res = await api.deletePurchase(id);
      if (res.success) {
        showToast('Purchase deleted and reconciled successfully', 'success');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete purchase', 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6B1724]/10 text-[#6B1724] flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Purchases & Raw Milk Procurement
            </h1>
            <p className="text-[11px] text-slate-500">
              Procurement register, supplier accounts, payments, and returns
            </p>
          </div>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'purchases' ? (
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setSupplierSearch('');
                  setIsSupplierDropdownOpen(false);
                }}
                id="record-purchase-btn"
                data-testid="record-purchase-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-bold rounded shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record New Purchase
              </button>
            ) : (
              <button
                onClick={() => setIsReturnModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6B1724] hover:bg-[#52121b] text-white text-xs font-bold rounded shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Record Purchase Return
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'bg-[#2E7D32] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Purchases Register ({purchases.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'returns'
              ? 'bg-[#2E7D32] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Purchase Returns ({returns.length})
        </button>
      </div>

      {/* Tab 1: Purchases Table */}
      {activeTab === 'purchases' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading procurement logs...</div>
          ) : purchases.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-lg border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-xs">No purchases recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Record a purchase to add raw stock to inventory</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Supplier</th>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Total Amount</th>
                      <th className="py-2 px-3 text-right">Paid (Mode)</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                      {isOwnerOrAdmin && <th className="py-2 px-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {purchases.map((p) => {
                      const supplierName = p.supplier_rel?.name || p.supplier || 'Direct Vendor';
                      const total = p.total_amount || (p.quantity * p.purchase_cost);
                      const paid = p.paid_amount || 0;
                      const balance = p.balance_amount !== undefined ? p.balance_amount : total - paid;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {p.purchased_at ? p.purchased_at.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : '')}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{supplierName}</td>
                          <td className="py-1.5 px-3 text-slate-700">{p.product?.name || 'Milk Product'}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                            {p.quantity} {p.unit}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                            ₹{Number(p.purchase_cost).toFixed(2)}/{p.unit}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(total).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                            ₹{Number(paid).toFixed(2)}{' '}
                            <span className="text-[10px] text-slate-400 font-normal">({p.payment_mode || 'Cash'})</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-700">
                            ₹{Number(balance).toFixed(2)}
                          </td>
                          {isOwnerOrAdmin && (
                            <td className="py-1.5 px-3 text-center">
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                title="Delete and Reconcile Stock"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* Tab 2: Purchase Returns Table */}
      {activeTab === 'returns' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading purchase returns...</div>
          ) : returns.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-lg border border-slate-200">
              <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-xs">No purchase returns recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Returned goods to suppliers will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      <th className="py-2 px-3">Return Date</th>
                      <th className="py-2 px-3">Return #</th>
                      <th className="py-2 px-3">Supplier</th>
                      <th className="py-2 px-3">Items / Product</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Total Returned</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {returns.map((ret) => {
                      const item = ret.items && ret.items[0];
                      const supplier = suppliers.find((s) => s.id === ret.supplierId);
                      return (
                        <tr key={ret._id || ret.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {ret.returnDate ? ret.returnDate.split('T')[0] : ''}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                            {ret.returnNumber}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">
                            {supplier?.name || ret.supplierName || 'Supplier'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-700">
                            {item?.productName || products.find((p) => p.id === item?.productId)?.name || 'Milk Product'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            -{item?.quantity || 0} {item?.unit || 'L'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                            ₹{Number(item?.rate || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            ₹{Number(ret.totalAmount || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-[11px] text-slate-500">
                            {ret.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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

      {/* Record Purchase Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  Record Purchase Return
                </h3>
                <p className="text-xs text-slate-500">Return damaged/sour milk or products back to supplier</p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Product *</label>
                  <select
                    value={returnProductId}
                    onChange={(e) => {
                      setReturnProductId(e.target.value);
                      const prod = products.find((p) => p.id === e.target.value);
                      if (prod) setReturnUnit(prod.base_unit);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier *</label>
                  <select
                    value={returnSupplierId}
                    onChange={(e) => setReturnSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                    required
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.mobile})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <input
                    type="text"
                    disabled
                    value={returnUnit}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm text-slate-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={returnRate}
                    onChange={(e) => setReturnRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                  />
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-900">Total Return Credit:</span>
                <span className="font-mono font-black text-sm text-rose-800">
                  ₹{(returnQuantity * returnRate).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Return Reason / Notes</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Sour milk, spilled curd, curdled batch"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1724]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="flex items-center gap-2 px-5 py-2 bg-[#6B1724] hover:bg-[#52121b] text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {submittingReturn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Return...
                    </>
                  ) : (
                    'Confirm Return'
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
