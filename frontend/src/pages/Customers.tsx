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
  const [sortBy, setSortBy] = useState<'name' | 'customerSince'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory
          </h2>
          <p className="text-xs text-slate-500">
            Manage subscribers, service lifecycle dates, and unique QR tokens
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/25 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter and Tabs Card */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search and Sort Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, address, or QR..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Customers
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Total: <strong className="text-slate-700 font-bold">{customers.length}</strong>
          </span>
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-500" />
            <p className="text-xs font-semibold">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {statusFilter === 'ALL'
                ? 'Add your first customer to start deliveries.'
                : `No customers matching '${statusFilter}' status.`}
            </p>
            {statusFilter === 'ALL' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="mt-4 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
              >
                Add First Customer
              </button>
            )}
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white hover:bg-slate-50/80 rounded-2xl p-4 border border-slate-200 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {/* Customer Info Clickable */}
              <div
                onClick={() => navigate(`/customers/${customer.id}`)}
                className="flex items-start gap-3 flex-1 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                  {customer.name[0]}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm hover:text-sky-600 transition-colors">
                      {customer.name}
                    </h3>
                    {customer.active ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                      </span>
                    )}
                    {(customer.assigned_qr || customer.assignedQr || customer.qr_token) && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        QR: {customer.assigned_qr || customer.assignedQr || customer.qr_token}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
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
                    <span className="flex items-center gap-1 text-sky-700 font-medium">
                      <Calendar className="w-3 h-3 text-sky-500" />
                      Since: {customer.customer_since ? formatDate(customer.customer_since) : '—'}
                    </span>
                    {customer.service_end_date && (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        Ended: {formatDate(customer.service_end_date)}
                      </span>
                    )}
                  </div>

                  {customer.ending_reason && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                      Reason: {customer.ending_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end shrink-0 flex-wrap">
                {/* QR Card */}
                <button
                  onClick={() => setQrCustomer(customer)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  title="Print / View QR Door Card"
                >
                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  QR Card
                </button>

                {/* Edit */}
                <button
                  onClick={() => setEditingCustomer(customer)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Edit Customer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Deactivate / Reactivate */}
                {customer.active ? (
                  <button
                    onClick={() => {
                      setDeactivateCustomer(customer);
                      setDeactivateReason('');
                    }}
                    className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                    title="Deactivate Customer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(customer)}
                    className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                    title="Reactivate Customer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete (Owner/Admin only) */}
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => setDeleteCustomer(customer)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* View Details */}
                <button
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
                  title="View Profile"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
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
