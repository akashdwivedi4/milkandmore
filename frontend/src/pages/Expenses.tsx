import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import {
  DollarSign,
  Plus,
  Calendar,
  Filter,
  Trash2,
  TrendingDown,
  Tag,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  'Electricity',
  'Transport',
  'Salary',
  'Packaging',
  'Maintenance',
  'Rent',
  'Other',
];

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Transport' as ExpenseCategory,
    description: '',
    amount: '',
    payment_method: 'Cash' as PaymentMethod,
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      if (res.success) {
        setExpenses(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, startDate, endDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Expense amount must be greater than zero');
      return;
    }
    if (!formData.description.trim()) {
      alert('Description is required');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createExpense({
        category: formData.category,
        description: formData.description,
        amount: numAmount,
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          category: 'Transport',
          description: '',
          amount: '',
          payment_method: 'Cash',
          expense_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchExpenses();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Business & Operating Expenses
            </h1>
            <p className="text-[11px] text-slate-500">
              Record utility, transportation, maintenance, rent, and overheads
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-bold rounded shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>

      {/* KPI & Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs md:col-span-1 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Filtered Expense
          </span>
          <p className="text-xl font-mono font-black text-rose-700 mt-0.5">₹{totalExpense.toFixed(2)}</p>
          <span className="text-[10px] text-slate-400 font-mono">{expenses.length} records in view</span>
        </div>

        <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs md:col-span-3 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mr-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Category:
          </div>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-700 font-bold text-xs">No expenses found for the selected filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Payment Mode</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-1.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{e.expense_date}</td>
                    <td className="py-1.5 px-3">
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-200">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">
                      <div>{e.description}</div>
                      {e.notes && <div className="text-[10px] text-slate-400 font-normal">{e.notes}</div>}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                        {e.payment_method}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                      ₹{Number(e.amount).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
            <h3 className="text-lg font-bold text-slate-900">Record New Expense</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Milk delivery vehicle diesel"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 200.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Receipt #428"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                  disabled={saving}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
