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
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Products & Inventory
          </h2>
          <p className="text-xs text-slate-500">
            Catalog rates, base units, and real-time inventory management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer-rates')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Percent className="w-4 h-4 text-brand-600" />
            Customer Rates Matrix
          </button>

          {isOwnerOrAdmin && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
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

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Products' : tab === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-xs font-semibold">Loading catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No products found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your search query or status filter.'
              : 'Add your first product to start managing dairy inventory.'}
          </p>
          {isOwnerOrAdmin && !searchQuery && statusFilter === 'ALL' && (
            <button
              onClick={openAdd}
              className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl"
            >
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((prod) => {
            const isActive = prod.is_active !== false;
            return (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                  isActive
                    ? 'border-slate-200 hover:border-brand-200'
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-slate-900">{prod.name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Base Unit:{' '}
                          <strong className="text-slate-800 font-bold">{prod.base_unit}</strong>
                        </p>
                      </div>
                    </div>

                    {isOwnerOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(prod)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isActive ? (
                          <button
                            onClick={() => setProductToDeactivate(prod)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                            title="Deactivate Product"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(prod)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                            title="Reactivate Product"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}
                        <button
                          onClick={() => setProductToDelete(prod)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats: Default Rate & Stock */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Default Rate
                    </span>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {formatCurrency(prod.default_rate)}
                      <span className="text-[11px] font-normal text-slate-500">
                        /{prod.base_unit}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Current Stock
                    </span>
                    <p
                      className={`text-base font-black mt-0.5 ${
                        prod.current_stock < 0
                          ? 'text-rose-600'
                          : prod.current_stock === 0
                          ? 'text-slate-500'
                          : 'text-emerald-700'
                      }`}
                    >
                      {prod.current_stock} {prod.base_unit}
                    </p>
                  </div>
                </div>

                {/* Supported Units Tag */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {prod.supported_units?.map((u) => (
                    <span
                      key={u.unit}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                    >
                      {u.unit} (×{u.factor})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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

