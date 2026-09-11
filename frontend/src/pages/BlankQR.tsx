import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../services/api';
import { Customer } from '../types';
import { useToast } from '../contexts/ToastContext';
import { AddCustomerModal } from '../components/AddCustomerModal';
import {
  QrCode,
  Plus,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  UserPlus,
  X,
  Loader2,
  Filter,
  ExternalLink,
  Tag,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface BackendQR {
  _id: string;
  businessId: string;
  qrCode: string;
  status: 'UNUSED' | 'ASSIGNED' | 'REVOKED';
  assignedCustomerId?: {
    _id: string;
    id?: string;
    name: string;
    mobile: string;
    address?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const BlankQR: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [qrs, setQrs] = useState<BackendQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'ASSIGNED'>('UNUSED');
  const [searchQuery, setSearchQuery] = useState('');

  // Generated QR data URLs (base64 image cache)
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  // Batch Generation modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchPrefix, setBatchPrefix] = useState('MM-QR-');
  const [generating, setGenerating] = useState(false);
  const [recentlyGenerated, setRecentlyGenerated] = useState<string[]>([]);

  // Assign to existing customer modal state
  const [assigningQr, setAssigningQr] = useState<BackendQR | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignCustomers, setAssignCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Add new customer modal state
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerQrCode, setNewCustomerQrCode] = useState<string | undefined>(undefined);

  // Single card print state
  const [singlePrintQr, setSinglePrintQr] = useState<BackendQR | null>(null);

  const fetchQRs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.listQRs({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 150,
      });
      if (res.success && Array.isArray(res.data)) {
        setQrs(res.data as BackendQR[]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load QR codes', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchQRs();
  }, [fetchQRs]);

  // Generate QR images in background for each code
  useEffect(() => {
    if (qrs.length === 0) return;

    let isMounted = true;
    const generateImages = async () => {
      const newImages: Record<string, string> = { ...qrImages };
      let changed = false;

      for (const item of qrs) {
        if (!newImages[item.qrCode]) {
          try {
            const url = await QRCode.toDataURL(item.qrCode, {
              width: 300,
              margin: 2,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
            newImages[item.qrCode] = url;
            changed = true;
          } catch (e) {
            console.error('QR generation failed for', item.qrCode, e);
          }
        }
      }

      if (isMounted && changed) {
        setQrImages(newImages);
      }
    };

    generateImages();
    return () => {
      isMounted = false;
    };
  }, [qrs]);

  // Customer search for assignment
  useEffect(() => {
    if (!assigningQr || !assignSearch.trim()) {
      setAssignCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await api.getCustomers({ search: assignSearch.trim(), limit: 6 });
        if (res.success) {
          setAssignCustomers(res.data);
        }
      } catch (err) {
        console.error('Failed to search customers', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [assignSearch, assigningQr]);

  // Filtered QRs based on search query
  const filteredQrs = useMemo(() => {
    if (!searchQuery.trim()) return qrs;
    const query = searchQuery.toLowerCase();
    return qrs.filter((q) => {
      const matchCode = q.qrCode.toLowerCase().includes(query);
      const matchCustomer =
        q.assignedCustomerId &&
        (q.assignedCustomerId.name.toLowerCase().includes(query) ||
          q.assignedCustomerId.mobile.includes(query));
      return matchCode || matchCustomer;
    });
  }, [qrs, searchQuery]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await api.generateQRs(batchCount, batchPrefix.trim());
      if (res.success && res.data) {
        showToast(`Generated ${res.data.length} blank QR tags!`, 'success');
        setRecentlyGenerated(res.data.map((q: any) => q.qrCode));
        await fetchQRs();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate QR codes', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAssignToCustomer = async (customer: Customer) => {
    if (!assigningQr) return;
    try {
      setAssigningLoading(true);
      const res = await api.assignQR(assigningQr.qrCode, customer.id);
      if (res.success) {
        showToast(`QR '${assigningQr.qrCode}' assigned to ${customer.name}!`, 'success');
        setAssigningQr(null);
        setAssignSearch('');
        fetchQRs();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to assign QR code', 'error');
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleDownloadPng = (code: string) => {
    const url = qrImages[code];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}.png`;
    a.click();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied ${code} to clipboard`, 'info');
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const handlePrintSingle = (qr: BackendQR) => {
    setSinglePrintQr(qr);
    setTimeout(() => {
      window.print();
      setSinglePrintQr(null);
    }, 150);
  };

  return (
    <div className="space-y-5">
      {/* Printable Sheet Container (Visible ONLY in print mode) */}
      <div className="hidden print:block printable-sheet">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-sheet, .printable-sheet * {
                visibility: visible !important;
              }
              .printable-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 10mm !important;
              }
              .print-grid {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 6mm !important;
              }
              .print-tag {
                border: 1.5pt solid #0f172a !important;
                border-radius: 8pt !important;
                padding: 6mm !important;
                text-align: center !important;
                background: white !important;
                page-break-inside: avoid !important;
              }
            }
          `}
        </style>

        <div className="print-grid">
          {(singlePrintQr ? [singlePrintQr] : filteredQrs).map((qr) => (
            <div key={qr._id} className="print-tag">
              <p className="text-[11pt] font-black text-slate-900 tracking-wider">
                MILK & MORE
              </p>
              <p className="text-[8pt] text-slate-500 font-semibold uppercase tracking-widest mb-2">
                Doorstep Delivery Tag
              </p>

              {qrImages[qr.qrCode] && (
                <img
                  src={qrImages[qr.qrCode]}
                  alt={qr.qrCode}
                  className="w-36 h-36 mx-auto my-1 object-contain"
                />
              )}

              <p className="font-mono font-bold text-[10pt] text-slate-900 mt-2 tracking-wide">
                {qr.qrCode}
              </p>

              {qr.assignedCustomerId ? (
                <div className="mt-1 text-[8pt] text-slate-700">
                  <p className="font-bold">{qr.assignedCustomerId.name}</p>
                  <p>{qr.assignedCustomerId.mobile}</p>
                </div>
              ) : (
                <p className="text-[7pt] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                  Scan to Register
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Screen UI: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Blank QR Code Tags
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Persistent Inventory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-generated physical QR tags stored in database. Scan or assign to any customer anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchQRs}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrintSheet}
            disabled={filteredQrs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Tag Sheet
          </button>

          <button
            onClick={() => {
              setRecentlyGenerated([]);
              setShowBatchModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate Batch
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 print:hidden">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by QR code (MM-QR-...) or assigned customer..."
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
          {(['UNUSED', 'ASSIGNED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab === 'UNUSED' ? 'Unused Blank' : tab === 'ASSIGNED' ? 'Assigned' : 'All Tags'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Persistent QR Cards */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 print:hidden">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-xs font-semibold">Loading QR code inventory...</p>
        </div>
      ) : filteredQrs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 print:hidden">
          <QrCode className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No QR codes found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No tags matched your search query.'
              : statusFilter === 'UNUSED'
              ? 'You have no unused blank QR tags. Click "Generate Batch" to create pre-printed stickers.'
              : 'No QR tags found for this filter.'}
          </p>
          <button
            onClick={() => {
              setRecentlyGenerated([]);
              setShowBatchModal(true);
            }}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Generate Blank QRs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:hidden">
          {filteredQrs.map((qr) => {
            const isUnused = qr.status === 'UNUSED';
            const imgUrl = qrImages[qr.qrCode];

            return (
              <div
                key={qr._id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md ${
                  isUnused
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {/* Header: Tag Badge & Copy */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isUnused
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {qr.status}
                  </span>

                  <button
                    onClick={() => handleCopyCode(qr.qrCode)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                    title="Copy QR String"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Visible QR Code Image */}
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-100">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={qr.qrCode}
                      className="w-32 h-32 object-contain rounded-lg shadow-2xs bg-white p-1"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}

                  <p className="font-mono font-bold text-xs text-slate-800 mt-2.5 tracking-wider bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {qr.qrCode}
                  </p>
                </div>

                {/* Assignment Details */}
                <div className="text-xs">
                  {qr.assignedCustomerId ? (
                    <div className="p-2 rounded-xl bg-sky-50/70 border border-sky-100 space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-sky-700">Assigned Customer</p>
                      <button
                        onClick={() =>
                          navigate(`/customers/${qr.assignedCustomerId?._id || qr.assignedCustomerId?.id}`)
                        }
                        className="font-bold text-slate-900 hover:text-brand-600 flex items-center gap-1 text-left"
                      >
                        {qr.assignedCustomerId.name}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                      <p className="text-[11px] text-slate-500">{qr.assignedCustomerId.mobile}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic text-center py-1">
                      Ready to assign to doorstep customer
                    </p>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    onClick={() => handlePrintSingle(qr)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex-1 flex items-center justify-center gap-1 transition-colors"
                    title="Print Single Tag"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Print</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPng(qr.qrCode)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex-1 flex items-center justify-center gap-1 transition-colors"
                    title="Download PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">PNG</span>
                  </button>

                  {isUnused && (
                    <button
                      onClick={() => {
                        setAssigningQr(qr);
                        setAssignSearch('');
                      }}
                      className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold flex-1 flex items-center justify-center gap-1 shadow-xs transition-colors"
                      title="Assign to Customer"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Assign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch QR Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Generate Blank QR Tags</h3>
                <p className="text-xs text-slate-500">
                  Creates persistent QR codes saved in database for doorstep stickers
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Prefix</label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="MM-QR-"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Quantity (1 - 100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) =>
                      setBatchCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-brand-50/60 border border-brand-100 rounded-xl text-[11px] text-brand-800 leading-relaxed">
                All generated QRs are permanently recorded in your account with <strong>UNUSED</strong> status
                so you can print them beforehand and link them on the field.
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating in database...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {batchCount} QR Code Tags
                  </>
                )}
              </button>
            </form>

            {recentlyGenerated.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Generated {recentlyGenerated.length} QR codes:
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-mono grid grid-cols-2 gap-1 text-slate-700">
                  {recentlyGenerated.map((code) => (
                    <div key={code} className="bg-white px-2 py-1 rounded border border-slate-200">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign QR to Customer Modal */}
      {assigningQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Assign QR Tag</h3>
                <p className="text-xs text-slate-500">
                  Link <span className="font-mono font-bold text-brand-700">{assigningQr.qrCode}</span> to a customer
                </p>
              </div>
              <button
                onClick={() => setAssigningQr(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1: Search Existing Customer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Assign to Existing Customer
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search customer by name or mobile..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {searchingCustomers && (
                <div className="py-4 text-center text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-brand-500" />
                </div>
              )}

              {assignCustomers.length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {assignCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleAssignToCustomer(cust)}
                      className="p-2.5 hover:bg-brand-50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">{cust.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {cust.mobile} {cust.address ? `• ${cust.address}` : ''}
                        </p>
                      </div>
                      <button
                        disabled={assigningLoading}
                        className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold rounded-lg shadow-2xs"
                      >
                        Select & Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {assignSearch && !searchingCustomers && assignCustomers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No matching customers found</p>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <hr className="w-full border-slate-200" />
              <span className="absolute bg-white px-2 text-[10px] uppercase font-bold text-slate-400">
                OR
              </span>
            </div>

            {/* Option 2: Register New Customer */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const targetCode = assigningQr.qrCode;
                  setAssigningQr(null);
                  setNewCustomerQrCode(targetCode);
                  setAddCustomerModalOpen(true);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Register New Customer with this QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal pre-filled with QR */}
      <AddCustomerModal
        isOpen={addCustomerModalOpen}
        initialQrCode={newCustomerQrCode}
        onClose={() => {
          setAddCustomerModalOpen(false);
          setNewCustomerQrCode(undefined);
        }}
        onSuccess={(customer) => {
          showToast(`Customer '${customer.name}' registered and QR linked!`, 'success');
          setAddCustomerModalOpen(false);
          setNewCustomerQrCode(undefined);
          fetchQRs();
        }}
      />
    </div>
  );
};
