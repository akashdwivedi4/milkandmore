import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, CustomerSummary, Delivery, Payment } from '../types';
import { formatCurrency, formatDate, formatTime, formatDateTime } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  User,
  Phone,
  MapPin,
  QrCode,
  Edit2,
  Plus,
  Receipt,
  FileText,
  Clock,
  Trash2,
  AlertCircle,
  IndianRupee,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Calendar,
  RotateCcw,
  UserCog,
  UserX,
  X,
} from 'lucide-react';
import { DeliveryModal } from '../components/DeliveryModal';
import { PaymentModal } from '../components/PaymentModal';
import { QrCardModal } from '../components/QrCardModal';
import { EditCustomerModal } from '../components/EditCustomerModal';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, business } = useAuth();
  const { showToast } = useToast();
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Deactivate and delete states
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'DELIVERIES' | 'PAYMENTS'>('DELIVERIES');

  const handleReactivate = async () => {
    if (!customer) return;
    try {
      setReactivating(true);
      const res = await api.reactivateCustomer(customer.id);
      if (res.success) {
        showToast('Customer activated successfully.', 'success');
        loadCustomerData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to activate customer', 'error');
    } finally {
      setReactivating(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!customer) return;
    try {
      setDeactivating(true);
      const res = await api.deactivateCustomer(customer.id, deactivateReason.trim() || undefined);
      if (res.success) {
        showToast('Customer deactivated successfully.', 'success');
        setIsDeactivateOpen(false);
        setDeactivateReason('');
        loadCustomerData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate customer', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customer) return;
    try {
      setDeleting(true);
      const res = await api.deleteCustomer(customer.id);
      if (res.success) {
        showToast('Customer deleted successfully.', 'success');
        navigate('/customers');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
      setIsDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const loadCustomerData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [custRes, delivRes, payRes] = await Promise.all([
        api.getCustomerById(id),
        api.getDeliveries({ customerId: id, limit: 100 }),
        api.getPayments(id),
      ]);

      if (custRes.success) {
        setCustomer(custRes.data);
        setSummary(custRes.data.summary);
      }
      if (delivRes.success) setDeliveries(delivRes.data);
      if (payRes.success) setPayments(payRes.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!window.confirm('Are you sure you want to delete this delivery? Stock and ledger will be automatically reversed.')) {
      return;
    }

    try {
      const res = await api.deleteDelivery(deliveryId);
      if (res.success) {
        showToast('Delivery deleted and stock restored successfully', 'success');
        loadCustomerData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete delivery', 'error');
    }
  };

  if (loading || !customer) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
        <p className="text-xs font-semibold">Loading customer profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Header Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-500/20 shrink-0">
              {customer.name[0]}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {customer.name}
                </h2>
                {customer.active ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.mobile}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {customer.address}
                  </span>
                )}
                <span className="flex items-center gap-1 text-sky-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  Customer Since: {customer.customer_since ? formatDate(customer.customer_since) : '—'}
                </span>
                {customer.service_end_date && (
                  <span className="flex items-center gap-1 text-amber-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Service Ended: {formatDate(customer.service_end_date)}
                  </span>
                )}
                {(customer.assigned_qr || customer.assignedQr || customer.qr_token) && (
                  <span
                    id="customer-profile-assigned-qr"
                    data-testid="customer-profile-assigned-qr"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-mono font-bold text-xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-sky-600" />
                    QR: {customer.assigned_qr || customer.assignedQr || customer.qr_token}
                  </span>
                )}
              </div>

              {customer.ending_reason && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block mt-1">
                  Ending Reason: {customer.ending_reason}
                </p>
              )}

              {customer.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg inline-block mt-1">
                  Note: {customer.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl border border-sky-200 transition-colors"
            >
              <UserCog className="w-4 h-4 text-sky-600" />
              Edit Profile
            </button>
            <button
              onClick={() => setIsQrOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              View QR Card
            </button>
            <button
              onClick={() => navigate(`/bills?customerId=${customer.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              Print Bill
            </button>
            {customer.active && (
              <button
                onClick={() => {
                  setDeactivateReason('');
                  setIsDeactivateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition-colors"
              >
                <UserX className="w-4 h-4 text-amber-600" />
                Deactivate
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Inactive Alert & Reactivate Banner */}
        {!customer.active && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  This customer is inactive. Service ended on {customer.service_end_date ? formatDate(customer.service_end_date) : 'N/A'}.
                </p>
                {customer.ending_reason && (
                  <p className="text-[11px] text-amber-700 mt-0.5">Reason: {customer.ending_reason}</p>
                )}
                <p className="text-[11px] text-amber-600 mt-0.5">
                  All historical deliveries, payments, and ledger balance remain intact.
                </p>
              </div>
            </div>
            {isOwnerOrAdmin && (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reactivate Customer
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              setEditDelivery(null);
              setIsDeliveryOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-sky-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Delivery
          </button>

          <button
            onClick={() => setIsPaymentOpen(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <IndianRupee className="w-4 h-4" />
            Record Payment
          </button>

          <button
            onClick={() => navigate(`/customer-rates?customerId=${customer.id}`)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-xs transition-colors"
          >
            <Edit2 className="w-4 h-4 text-slate-400" />
            Custom Rates
          </button>

          <button
            onClick={() => setIsQrOpen(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-xs transition-colors"
          >
            <QrCode className="w-4 h-4 text-sky-600" />
            Print QR Card
          </button>
        </div>
      </div>

      {/* Financial Ledger Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Today's Deliveries */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Today's Drops
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {summary?.todayDeliveriesCount || 0}
          </p>
          <span className="text-xs text-slate-500 font-medium">
            {formatCurrency(summary?.todayDeliveryAmount || 0)}
          </span>
        </div>

        {/* Total Deliveries */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Deliveries
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {summary?.totalDeliveriesCount || 0}
          </p>
          <span className="text-xs text-slate-500 font-medium">
            {formatCurrency(summary?.totalDeliveryAmount || 0)}
          </span>
        </div>

        {/* Total Payments */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Payments
          </span>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {formatCurrency(summary?.totalPayments || 0)}
          </p>
          <span className="text-xs text-emerald-600/80 font-medium">Recorded Collections</span>
        </div>

        {/* Previous Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Previous Balance
          </span>
          <p className="text-xl font-black text-slate-700 mt-1">
            {formatCurrency(summary?.previousBalance || 0)}
          </p>
          <span className="text-xs text-slate-400 font-medium">Prior to today</span>
        </div>

        {/* Opening Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Opening Balance
          </span>
          <p className="text-xl font-black text-slate-700 mt-1">
            {formatCurrency(customer?.opening_balance || 0)}
          </p>
          <span className="text-xs text-slate-400 font-medium">Initial Balance</span>
        </div>

        {/* Current Outstanding */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Current Outstanding
          </span>
          <p className="text-xl font-black text-rose-800 mt-1 leading-none">
            {formatCurrency(summary?.currentOutstanding || 0)}
          </p>
          <span className="text-xs text-rose-600 font-bold block mt-1">Net Balance Due</span>
        </div>
      </div>

      {/* Tabs: Delivery History & Payments */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('DELIVERIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DELIVERIES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Delivery History ({deliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PAYMENTS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Payments History ({payments.length})
          </button>
        </div>

        {/* Tab 1: Delivery History */}
        {activeTab === 'DELIVERIES' && (
          <div>
            {deliveries.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No deliveries recorded for this customer yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {deliveries.map((deliv) => (
                  <div
                    key={deliv.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {formatDateTime(deliv.delivered_at)}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {formatDate(deliv.delivery_date)}
                        </span>
                        {deliv.shift && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                            {deliv.shift}
                          </span>
                        )}
                        {(deliv.is_additional || (deliv as any).isAdditional) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Extra Drop
                          </span>
                        )}
                      </div>

                      {/* Items list */}
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {deliv.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {it.quantity} {it.unit}
                            </span>
                            <span>{it.product?.name || 'Milk Product'}</span>
                            <span className="text-slate-400">@ {formatCurrency(it.rate)}</span>
                            <span className="font-bold text-slate-900">= {formatCurrency(it.amount)}</span>
                          </div>
                        ))}
                      </div>

                      {deliv.notes && (
                        <p className="text-[11px] text-slate-400 italic">"{deliv.notes}"</p>
                      )}
                    </div>

                    {/* Total and Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 block leading-none">
                          {formatCurrency(deliv.total_amount)}
                        </span>
                        <span className="text-[10px] text-slate-400">Delivery Total</span>
                      </div>

                      {/* Authorized Edit/Delete actions */}
                      {isOwnerOrAdmin && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                          <button
                            onClick={() => {
                              setEditDelivery(deliv);
                              setIsDeliveryOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit Delivery"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDelivery(deliv.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Delivery & Restore Stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payments History */}
        {activeTab === 'PAYMENTS' && (
          <div>
            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No payments recorded for this customer yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {formatDateTime(p.paid_at)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {p.payment_method}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-xs text-slate-500">{p.notes}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600 block leading-none">
                        - {formatCurrency(p.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">Credited to Account</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {isDeliveryOpen && customer && (
        <DeliveryModal
          customer={customer}
          existingDelivery={editDelivery}
          isOpen={isDeliveryOpen}
          onClose={() => {
            setIsDeliveryOpen(false);
            setEditDelivery(null);
          }}
          onSuccess={() => {
            loadCustomerData();
          }}
        />
      )}

      {isPaymentOpen && customer && (
        <PaymentModal
          customer={customer}
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            loadCustomerData();
          }}
        />
      )}

      {isQrOpen && customer && (
        <QrCardModal
          customer={customer}
          business={business}
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
        />
      )}

      {isEditOpen && customer && (
        <EditCustomerModal
          isOpen={isEditOpen}
          customer={customer}
          onClose={() => setIsEditOpen(false)}
          onSuccess={(updated) => {
            setCustomer(updated);
            loadCustomerData();
          }}
        />
      )}

      {/* Deactivate Customer Confirmation Modal */}
      {isDeactivateOpen && customer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Deactivate Customer</h3>
                  <p className="text-[11px] text-slate-500">{customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeactivateOpen(false)}
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
                onClick={() => setIsDeactivateOpen(false)}
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
      {isDeleteOpen && customer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Delete Customer</h3>
                  <p className="text-[11px] text-slate-500">{customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteOpen(false)}
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
                onClick={() => setIsDeleteOpen(false)}
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
