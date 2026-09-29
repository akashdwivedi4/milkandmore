import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Power,
  Search,
  CheckCircle2,
  X,
  Loader2,
  Percent,
  AlertTriangle,
} from 'lucide-react';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const alphabets = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  // Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'add');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Form State
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState<'L' | 'KG'>('L');
  const [defaultRate, setDefaultRate] = useState<number>(60);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Delete & Deactivate Modals State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const openAdd = () => {
    setEditingProduct(null);
    setName('');
    setBaseUnit('L');
    setDefaultRate(60);
    setInitialStock(0);
    setIsModalOpen(true);
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setBaseUnit((prod.base_unit as 'L' | 'KG') || 'L');
    setDefaultRate(prod.default_rate);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.id, {
          name: name.trim(),
          default_rate: defaultRate,
        });
        if (res.success) {
          showToast('Product updated successfully', 'success');
          setIsModalOpen(false);
          fetchProducts();
        }
      } else {
        const supported_units =
          baseUnit === 'L'
            ? [
                { unit: 'L', factor: 1.0 },
                { unit: 'ML', factor: 0.001 },
              ]
            : [
                { unit: 'KG', factor: 1.0 },
                { unit: 'Gram', factor: 0.001 },
              ];

        const res = await api.createProduct({
          name: name.trim(),
          base_unit: baseUnit,
          supported_units,
          default_rate: defaultRate,
          current_stock: initialStock,
        });

        if (res.success) {
          showToast('Product created successfully', 'success');
          setIsModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!productToDeactivate) return;
    try {
      setActionLoading(true);
      const res = await api.deactivateProduct(productToDeactivate.id);
      if (res.success) {
        showToast(`'${productToDeactivate.name}' deactivated successfully`, 'success');
        setProductToDeactivate(null);
        fetchProducts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate product', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (prod: Product) => {
    try {
      setActionLoading(true);
      const res = await api.activateProduct(prod.id);
      if (res.success) {
        showToast(`'${prod.name}' reactivated successfully`, 'success');
        fetchProducts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reactivate product', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      setActionLoading(true);
      const res = await api.deleteProduct(productToDelete.id);
      if (res.success) {
        showToast('Product deleted successfully', 'success');
        setProductToDelete(null);
        fetchProducts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
      setProductToDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  const displayedProducts = products.filter((p) => {
    if (selectedLetter !== 'ALL') {
      return (p.name || '').trim().toUpperCase().startsWith(selectedLetter);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Products & Item Master
          </h2>
          <p className="text-xs text-slate-500">
            Catalog rates, base units, live dairy inventory and custom customer pricing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer-rates')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
          >
            <Percent className="w-3.5 h-3.5 text-[#6B1724]" />
            Customer Rates Matrix
          </button>

          {isOwnerOrAdmin && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Products' : tab === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* iRujul A-Z Alphabet Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1 overflow-x-auto pb-1 select-none scrollbar-thin">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">A-Z:</span>
          {alphabets.map((letter) => {
            const isSelected = selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] font-bold rounded transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-[#6B1724] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Presentation */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2E7D32]" />
          <p className="text-xs font-semibold">Loading catalog...</p>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No products found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || selectedLetter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try changing your search query or alphabet filter.'
              : 'Add your first product to start managing dairy inventory.'}
          </p>
          {isOwnerOrAdmin && !searchQuery && selectedLetter === 'ALL' && statusFilter === 'ALL' && (
            <button
              onClick={openAdd}
              className="mt-4 px-4 py-2 bg-[#2E7D32] text-white text-xs font-bold rounded-xl"
            >
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Dense iRujul Item Master Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Item / Product Name</th>
                  <th className="py-2.5 px-3 text-center">Base Unit</th>
                  <th className="py-2.5 px-3 text-right">Default Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Live Stock</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedProducts.map((prod, idx) => {
                  const isActive = prod.is_active !== false;
                  const currentStock = prod.current_stock ?? 0;
                  const isLow = currentStock <= 10;
                  return (
                    <tr key={prod.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                            <Package className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <span>{prod.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {prod.base_unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-[13px]">
                        {formatCurrency(prod.default_rate)}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">/{prod.base_unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono font-bold text-[12px] px-2 py-0.5 rounded ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {currentStock} {prod.base_unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isOwnerOrAdmin && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEdit(prod)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isActive ? (
                              <button
                                onClick={() => setProductToDeactivate(prod)}
                                className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                                title="Deactivate Product"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(prod)}
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                title="Reactivate Product"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            )}
                            <button
                              onClick={() => setProductToDelete(prod)}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Screen < md) */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedProducts.map((prod) => {
              const isActive = prod.is_active !== false;
              const currentStock = prod.current_stock ?? 0;
              const isLow = currentStock <= 10;
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                            isActive
                              ? 'bg-brand-50 text-brand-700'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Unit: <strong className="text-slate-800 font-bold">{prod.base_unit}</strong>
                          </p>
                        </div>
                      </div>

                      {isOwnerOrAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(prod)}
                            className="p-1 text-slate-400 hover:text-brand-600 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isActive ? (
                            <button
                              onClick={() => setProductToDeactivate(prod)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                              title="Deactivate"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(prod)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                              title="Reactivate"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => setProductToDelete(prod)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Rate</span>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(prod.default_rate)}
                        <span className="text-[10px] text-slate-500 font-normal">/{prod.base_unit}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Stock</span>
                      <span className={`font-bold font-mono text-sm ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                        {currentStock} {prod.base_unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Buffalo Milk"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>

              {!editingProduct && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Base Unit *
                  </label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value as 'L' | 'KG')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="L">Litre (L / ML)</option>
                    <option value="KG">Kilogram (KG / Gram)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Default Rate (₹ / {baseUnit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>

              {!editingProduct && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Initial Opening Stock ({baseUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={initialStock}
                    onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-2 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {productToDeactivate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deactivate Product?</h3>
                <p className="text-xs text-slate-500">Safely archives product from daily operations</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-800">{productToDeactivate.name}</strong>?
              It will no longer appear for new deliveries or purchases, but all historical records and sales reports remain preserved.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDeactivate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeactivate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Product</h3>
                <p className="text-xs text-slate-500">{productToDelete.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Are you sure you want to delete this product?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

