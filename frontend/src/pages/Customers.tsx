import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Customer } from '../types';
import { formatDate } from '../utils/format';
import {
  Users,
  Search,
  UserPlus,
  QrCode,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  ArrowUpDown,
  X,
  Calculator,
} from 'lucide-react';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { EditCustomerModal } from '../components/EditCustomerModal';
import { QrCardModal } from '../components/QrCardModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialAction = searchParams.get('action');

  const { business, role } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'customerSince'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const alphabets = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(initialAction === 'add');

  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== search) {
      setSearch(urlSearch);
    }
    if (searchParams.get('action') === 'add') {
      setIsAddOpen(true);
    }
  }, [searchParams]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [qrCustomer, setQrCustomer] = useState<Customer | null>(null);

  // Deactivate modal state
  const [deactivateCustomer, setDeactivateCustomer] = useState<Customer | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  // Delete modal state
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search: search.trim() || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
        limit: 200,
      });
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      showToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, sortBy, sortOrder]);

  const handleReactivate = async (cust: Customer) => {
    try {
      const res = await api.reactivateCustomer(cust.id);
      if (res.success) {
        showToast(`Customer ${cust.name} activated successfully.`, 'success');
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to activate customer', 'error');
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateCustomer) return;
    try {
      setDeactivating(true);
      const res = await api.deactivateCustomer(deactivateCustomer.id, deactivateReason.trim() || undefined);
      if (res.success) {
        showToast(`Customer ${deactivateCustomer.name} deactivated successfully.`, 'success');
        setDeactivateCustomer(null);
        setDeactivateReason('');
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate customer', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCustomer) return;
    try {
      setDeleting(true);
      const res = await api.deleteCustomer(deleteCustomer.id);
      if (res.success) {
        showToast(`Customer "${deleteCustomer.name}" deleted successfully.`, 'success');
        setDeleteCustomer(null);
        fetchCustomers();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
      setDeleteCustomer(null);
    } finally {
      setDeleting(false);
    }
  };

  const displayedCustomers = customers.filter((c) => {
    if (selectedLetter !== 'ALL') {
      return (c.name || '').trim().toUpperCase().startsWith(selectedLetter);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Master & Ledger Directory
          </h2>
          <p className="text-xs text-slate-500">
            Subscriber accounts, A–Z customer lookup, lifecycle dates, and QR door cards
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2E7D32] hover:bg-[#256629] active:bg-[#1e5421] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter and Tabs Card */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Search and Sort Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, address, or QR..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as ['name' | 'customerSince', 'asc' | 'desc'];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-[#2E7D32] focus:outline-none"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="customerSince-desc">Newest Customers First</option>
              <option value="customerSince-asc">Oldest Customers First</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs: ALL / ACTIVE / INACTIVE */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Customers
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-[#2E7D32] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing: <strong className="text-slate-800 font-bold">{displayedCustomers.length}</strong> of {customers.length}
          </span>
        </div>

        {/* iRujul A-Z Quick Alphabet Filter Bar */}
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

      {/* Customers List & Table */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2E7D32]" />
            <p className="text-xs font-semibold">Loading customers...</p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedLetter !== 'ALL'
                ? `No customers found starting with '${selectedLetter}'.`
                : statusFilter === 'ALL'
                ? 'Add your first customer to start deliveries.'
                : `No customers matching '${statusFilter}' status.`}
            </p>
            {selectedLetter === 'ALL' && statusFilter === 'ALL' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="mt-4 px-4 py-2 bg-[#2E7D32] text-white text-xs font-bold rounded-xl"
              >
                Add First Customer
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Dense iRujul Master Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Delivery Address</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">QR Token</th>
                    <th className="py-2.5 px-3">Dates</th>
                    <th className="py-2.5 px-3 text-center">Account</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {displayedCustomers.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="font-bold text-slate-900 hover:text-sky-700 cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {customer.name[0]}
                          </div>
                          <span>{customer.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                        {customer.mobile}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={customer.address || '—'}>
                        {customer.address || '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {customer.active ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {(customer.assigned_qr || customer.assignedQr || customer.qr_token) ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            {customer.assigned_qr || customer.assignedQr || customer.qr_token}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        {customer.service_end_date ? (
                          <span className="text-amber-700 font-semibold" title={`Reason: ${customer.ending_reason || 'N/A'}`}>
                            Ended: {formatDate(customer.service_end_date)}
                          </span>
                        ) : (
                          <span>Since: {customer.customer_since ? formatDate(customer.customer_since) : '—'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => navigate(`/accounts?customerId=${customer.id}`)}
                          className="px-2.5 py-1 rounded-md bg-[#6B1724] hover:bg-[#52121b] text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                          title="Open Customer Account & Ledger"
                        >
                          <Calculator className="w-3 h-3 text-amber-300" />
                          <span>Account</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setQrCustomer(customer)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Print / View QR Door Card"
                          >
                            <QrCode className="w-3.5 h-3.5 text-sky-600" />
                          </button>
                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {customer.active ? (
                            <button
                              onClick={() => {
                                setDeactivateCustomer(customer);
                                setDeactivateReason('');
                              }}
                              className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                              title="Deactivate Customer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(customer)}
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                              title="Reactivate Customer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => setDeleteCustomer(customer)}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="View Customer Profile"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Screen < md) */}
            <div className="md:hidden space-y-2.5">
              {displayedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5"
                >
                  <div
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                      {customer.name[0]}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {customer.name}
                        </h3>
                        {customer.active ? (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                            Inactive
                          </span>
                        )}
                        {(customer.assigned_qr || customer.assignedQr || customer.qr_token) && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            QR: {customer.assigned_qr || customer.assignedQr || customer.qr_token}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {customer.mobile}
                        </span>
                        {customer.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Account */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/accounts?customerId=${customer.id}`)}
                      className="px-2.5 py-1 rounded bg-[#6B1724] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-300" />
                      <span>Account</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQrCustomer(customer)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700"
                        title="QR Door Card"
                      >
                        <QrCode className="w-3.5 h-3.5 text-sky-600" />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {customer.active ? (
                        <button
                          onClick={() => {
                            setDeactivateCustomer(customer);
                            setDeactivateReason('');
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200"
                          title="Deactivate Customer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(customer)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="Reactivate Customer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => setDeleteCustomer(customer)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          fetchCustomers();
        }}
      />

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          isOpen={!!editingCustomer}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            setEditingCustomer(null);
            fetchCustomers();
          }}
        />
      )}

      {/* QR Card Modal */}
      {qrCustomer && (
        <QrCardModal
          customer={qrCustomer}
          business={business}
          isOpen={!!qrCustomer}
          onClose={() => setQrCustomer(null)}
        />
      )}

      {/* Deactivate Customer Confirmation Modal */}
      {deactivateCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Deactivate Customer</h3>
                  <p className="text-[11px] text-slate-500">{deactivateCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeactivateCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deactivating this customer will pause future automatic deliveries. All historical deliveries, payments, and account ledger records will be preserved safely.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Ending Service (Optional)
              </label>
              <input
                type="text"
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="e.g. Moved out, temporary hold, personal request..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateCustomer(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivating}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                {deactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  'Confirm Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete Customer</h3>
                  <p className="text-[11px] text-slate-500">{deleteCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Are you sure you want to delete this customer?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCustomer(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
