import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Product } from '../types';
import {
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Plus,
  Search,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts();
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockProducts = products.filter(
    (p) => p.current_stock <= (p.low_stock_threshold || 20)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-sky-500" />
            Live Dairy Inventory & Stock
          </h1>
          <p className="text-sm text-slate-500">
            Real-time stock monitoring with automatic delivery consumption & purchase replenishment
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/purchases"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-sm text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Purchase (Stock IN)
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Products
            </span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{products.length}</p>
          </div>
          <Package className="w-8 h-8 text-sky-400 bg-sky-50 p-1.5 rounded-xl" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Low Stock Warnings
            </span>
            <p
              className={`text-2xl font-bold mt-1 ${
                lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {lowStockProducts.length}
            </p>
          </div>
          <AlertTriangle
            className={`w-8 h-8 p-1.5 rounded-xl ${
              lowStockProducts.length > 0
                ? 'text-amber-500 bg-amber-50'
                : 'text-emerald-500 bg-emerald-50'
            }`}
          />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Protection Status
            </span>
            <p className="text-sm font-bold text-emerald-600 mt-1">Negative Stock Blocked</p>
            <span className="text-xs text-slate-400">Atomic transactions active</span>
          </div>
          <ArrowDownRight className="w-8 h-8 text-emerald-400 bg-emerald-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Attention: {lowStockProducts.length} product(s) are low in stock!</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStockProducts.map((p) => `${p.name} (${p.current_stock} ${p.base_unit})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search products in inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Stock Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading stock inventory...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Base Unit</th>
                  <th className="p-4 text-right">Selling Rate</th>
                  <th className="p-4 text-right">Current Available Stock</th>
                  <th className="p-4">Stock Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const threshold = p.low_stock_threshold || 20;
                  const isLow = p.current_stock <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{p.name}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{p.base_unit}</td>
                      <td className="p-4 text-right font-medium text-slate-700">₹{p.default_rate.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-lg text-slate-900">
                        {p.current_stock} <span className="text-xs font-normal text-slate-500">{p.base_unit}</span>
                      </td>
                      <td className="p-4">
                        {isLow ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Stock (≤{threshold})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold w-fit">
                            Adequate Stock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to="/purchases"
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-xs font-semibold transition-all"
                        >
                          + Purchase
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
