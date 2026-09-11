import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Supplier } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  TrendingUp,
  FileText,
  AlertCircle,
  Trash2,
  X,
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    notes: '',
    opening_payable: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers({ search });
      if (res.success) {
        setSuppliers(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('Name and Mobile are required');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createSupplier(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({ name: '', mobile: '', address: '', notes: '', opening_payable: 0 });
        setSearch('');
        fetchSuppliers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    try {
      await api.deleteSupplier(id);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete supplier');
    }
  };

  const totalPayables = suppliers.reduce((s, sup) => s + (sup.current_payable || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-500" />
            Suppliers & Raw Milk Vendors
          </h1>
          <p className="text-sm text-slate-500">
            Manage your milk suppliers, view running balances, and record payments
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          data-testid="add-supplier-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Suppliers
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{suppliers.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Outstanding Payable
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">₹{totalPayables.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Action
            </span>
            <p className="text-sm font-medium text-slate-700 mt-1">Record Supplier Payment</p>
          </div>
          <Link
            to="/purchases"
            className="text-xs font-semibold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100"
          >
            Go to Purchases →
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          id="supplier-search-input"
          data-testid="supplier-search-input"
          placeholder="Search suppliers by name or phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all"
        />
        {search && (
          <button
            id="clear-supplier-search-btn"
            data-testid="clear-supplier-search-btn"
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suppliers Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading suppliers...</div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            {search ? `No suppliers matching "${search}"` : 'No suppliers found'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try clearing your search query' : 'Click "Add Supplier" to record your first vendor'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold text-xs border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Opening Payable</th>
                  <th className="p-4">Total Purchases</th>
                  <th className="p-4">Current Payable</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      <div>{s.name}</div>
                      {s.address && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {s.address}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {s.mobile}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">₹{Number(s.opening_payable || 0).toFixed(2)}</td>
                    <td className="p-4 text-slate-600">₹{Number(s.total_purchases || 0).toFixed(2)}</td>
                    <td className="p-4 font-bold text-amber-600">
                      ₹{Number(s.current_payable || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/suppliers/${s.id}`}
                          data-testid={`supplier-ledger-btn-${s.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ledger
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Supplier</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="supplier-name-input" className="block text-xs font-semibold text-slate-600 mb-1">
                  Supplier / Dairy Name *
                </label>
                <input
                  type="text"
                  id="supplier-name-input"
                  name="name"
                  data-testid="supplier-name-input"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sharma Dairy Farm"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="supplier-mobile-input" className="block text-xs font-semibold text-slate-600 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  id="supplier-mobile-input"
                  name="mobile"
                  data-testid="supplier-mobile-input"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9825012345"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label htmlFor="supplier-opening-payable-input" className="block text-xs font-semibold text-slate-600 mb-1">
                  Opening Payable (₹)
                </label>
                <input
                  type="number"
                  id="supplier-opening-payable-input"
                  name="opening_payable"
                  data-testid="supplier-opening-payable-input"
                  step="0.01"
                  min="0"
                  value={formData.opening_payable}
                  onChange={(e) => setFormData({ ...formData, opening_payable: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <p className="text-xs text-slate-400 mt-1">Existing balance owed before using Milk & More</p>
              </div>

              <div>
                <label htmlFor="supplier-address-input" className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <textarea
                  id="supplier-address-input"
                  name="address"
                  data-testid="supplier-address-input"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Village / Farm address..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label htmlFor="supplier-notes-input" className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <input
                  type="text"
                  id="supplier-notes-input"
                  name="notes"
                  data-testid="supplier-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Delivers morning 5 AM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-supplier-btn"
                  data-testid="save-supplier-btn"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
