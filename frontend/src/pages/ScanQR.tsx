import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { api } from '../services/api';
import { Customer } from '../types';
import { useToast } from '../contexts/ToastContext';
import {
  QrCode,
  Flashlight,
  FlashlightOff,
  Search,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DeliveryModal } from '../components/DeliveryModal';
import { AddCustomerModal } from '../components/AddCustomerModal';

export const ScanQR: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [scannerActive, setScannerActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Manual search fallback
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected customer for delivery workflow
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Unused QR handling
  const [unassignedQr, setUnassignedQr] = useState<string | null>(null);
  const [showAssignToExisting, setShowAssignToExisting] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignCustomers, setAssignCustomers] = useState<Customer[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Inactive customer warning confirmation
  const [inactiveWarningCustomer, setInactiveWarningCustomer] = useState<Customer | null>(null);

  // Add Customer modal state with prefilled QR
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerQr, setNewCustomerQr] = useState<string | undefined>(undefined);

  // Batch QR Generator modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generatePrefix, setGeneratePrefix] = useState('MM-QR-');
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const startScanner = async () => {
    try {
      setCameraPermissionError(null);

      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          handleQrScanned(decodedText);
        },
        () => {}
      );

      setScannerActive(true);

      try {
        const track = (html5QrCode as any).localMediaStream?.getVideoTracks()[0];
        if (track && track.getCapabilities && (track.getCapabilities() as any).torch) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      if (err.name === 'NotAllowedError' || String(err).includes('Permission denied')) {
        setCameraPermissionError(
          'Camera permission was denied. Please allow camera access in your browser settings, or use customer search below.'
        );
      } else {
        setCameraPermissionError(
          'Camera is unavailable on this device. Please use customer search below.'
        );
      }
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Stop scanner warning:', err);
    } finally {
      setScannerActive(false);
      setTorchEnabled(false);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const toggleTorch = async () => {
    try {
      if (!html5QrCodeRef.current) return;
      const html5QrCode = html5QrCodeRef.current as any;
      const track = html5QrCode.localMediaStream?.getVideoTracks()[0];
      if (track) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled }],
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch {
      showToast('Flashlight not supported on this camera', 'info');
    }
  };

  // Handle scanned QR Code
  const handleQrScanned = async (token: string) => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      showToast('Invalid QR code scanned.', 'error');
      isProcessingRef.current = false;
      return;
    }

    try {
      showToast('Resolving QR tag...', 'info');
      const res = await api.resolveQR(cleanToken);

      if (res.success && res.data) {
        if (res.data.status === 'UNUSED') {
          // Unassigned blank QR scanned!
          setUnassignedQr(cleanToken);
        } else if (res.data.status === 'ASSIGNED' && res.data.customer) {
          const cust = res.data.customer;
          // Check if customer is inactive
          if (cust.status === 'INACTIVE' || cust.active === false) {
            setInactiveWarningCustomer(cust);
          } else {
            setSelectedCustomer(cust);
          }
        } else if (res.data.id) {
          // Direct customer payload
          if (res.data.status === 'INACTIVE' || res.data.active === false) {
            setInactiveWarningCustomer(res.data);
          } else {
            setSelectedCustomer(res.data);
          }
        }
      }
    } catch (err: any) {
      // If QR not recognized in DB, offer to register
      setUnassignedQr(cleanToken);
      showToast('QR code not recognized yet. You can assign it now.', 'info');
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1800);
    }
  };

  // Attach simulateQrScan to window for automated testing and browser simulation
  useEffect(() => {
    (window as any).simulateQrScan = (token: string) => handleQrScanned(token);
    return () => {
      delete (window as any).simulateQrScan;
    };
  }, []);

  // Customer search for fallback
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.getCustomers({ search: searchQuery.trim(), limit: 5 });
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search for assigning to existing customer
  useEffect(() => {
    if (!showAssignToExisting || !assignSearch.trim()) {
      setAssignCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getCustomers({ search: assignSearch.trim(), limit: 5 });
        if (res.success) {
          setAssignCustomers(res.data);
        }
      } catch (err) {
        console.error('Assign search error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [assignSearch, showAssignToExisting]);

  const handleAssignToCustomer = async (customer: Customer) => {
    if (!unassignedQr) return;
    try {
      setAssigning(true);
      await api.assignQR(unassignedQr, customer.id);
      showToast(`QR ${unassignedQr} assigned to ${customer.name}!`, 'success');
      setShowAssignToExisting(false);
      setUnassignedQr(null);
      setSelectedCustomer(customer);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign QR code', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      const res = await api.generateQRs(generateCount, generatePrefix);
      if (res.success && res.data) {
        setGeneratedCodes(res.data.map((q: any) => q.qrCode));
        showToast(`Generated ${res.data.length} blank QR tags!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate QR codes', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header with Batch QR Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Scan Customer QR
          </h2>
          <p className="text-xs text-slate-500">
            Scan doorstep QR to record deliveries or link tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/blank-qr')}
            className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-brand-600" />
            Blank QRs
          </button>
          <button
            onClick={() => {
              setGeneratedCodes([]);
              setShowGenerateModal(true);
            }}
            id="batch-qrs-btn"
            data-testid="batch-qrs-btn"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Batch QRs
          </button>
        </div>
      </div>

      {/* Camera Viewport Container */}
      <div className="relative bg-slate-950 rounded-3xl overflow-hidden shadow-2xl aspect-square border-4 border-slate-900">
        <div id="qr-reader" className="w-full h-full" />

        {/* Custom Target Scanner Overlay */}
        {scannerActive && !cameraPermissionError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="w-56 h-56 border-2 border-brand-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-pulse top-1/2" />
            </div>
            <p className="text-white text-xs font-bold mt-4 tracking-wide bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs">
              Align QR code inside box
            </p>
          </div>
        )}

        {/* Torch Toggle */}
        {scannerActive && torchSupported && (
          <button
            onClick={toggleTorch}
            className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs shadow-lg transition-transform active:scale-95"
            title="Toggle Flashlight"
          >
            {torchEnabled ? (
              <Flashlight className="w-5 h-5 text-amber-400" />
            ) : (
              <FlashlightOff className="w-5 h-5 text-slate-300" />
            )}
          </button>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraPermissionError && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm">Camera Unavailable</h3>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              {cameraPermissionError}
            </p>
            <button
              onClick={() => {
                setCameraPermissionError(null);
                startScanner();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Unassigned QR Detected Alert Banner */}
      {unassignedQr && (
        <div
          data-testid="unassigned-qr-banner"
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Empty QR Code Detected</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                  {unassignedQr}
                </span>{' '}
                is not currently assigned to any customer.
              </p>
            </div>
            <button
              onClick={() => setUnassignedQr(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              id="add-customer-with-qr-btn"
              data-testid="add-customer-with-qr-btn"
              onClick={() => {
                setNewCustomerQr(unassignedQr);
                setAddCustomerModalOpen(true);
                setUnassignedQr(null);
              }}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Customer With This QR
            </button>

            <button
              id="assign-to-existing-customer-btn"
              data-testid="assign-to-existing-customer-btn"
              onClick={() => setShowAssignToExisting(true)}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Assign to Existing Customer
            </button>
          </div>
        </div>
      )}

      {/* Inactive Customer Warning Dialog */}
      {inactiveWarningCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-amber-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Customer is Inactive</h3>
                <p className="text-xs text-slate-500">Service is paused or terminated</p>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">{inactiveWarningCustomer.name}</p>
              <p className="text-slate-600 text-[11px]">{inactiveWarningCustomer.mobile}</p>
              <p className="mt-2 text-slate-700">
                This customer is marked as <strong>INACTIVE</strong>. Do you still want to record a delivery?
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setInactiveWarningCustomer(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cust = inactiveWarningCustomer;
                  setInactiveWarningCustomer(null);
                  setSelectedCustomer(cust);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Existing Customer Modal */}
      {showAssignToExisting && unassignedQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Assign QR Code</h3>
                <p className="text-xs font-mono text-slate-500">{unassignedQr}</p>
              </div>
              <button
                onClick={() => setShowAssignToExisting(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search customer by name or mobile..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
              {assignCustomers.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  {assignSearch ? 'No matching customers found' : 'Type name or phone to search'}
                </p>
              ) : (
                assignCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleAssignToCustomer(c)}
                    className="p-2.5 rounded-xl hover:bg-sky-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.mobile}</p>
                    </div>
                    <button
                      disabled={assigning}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold rounded-lg"
                    >
                      Assign Tag
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch QR Generator Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Generate Blank QR Tags</h3>
                <p className="text-xs text-slate-500">Create pre-printed QR stickers for doorstep delivery</p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                id="close-batch-modal-btn"
                data-testid="close-batch-modal-btn"
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Prefix</label>
                <input
                  type="text"
                  id="batch-qr-prefix-input"
                  data-testid="batch-qr-prefix-input"
                  value={generatePrefix}
                  onChange={(e) => setGeneratePrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
                <input
                  type="number"
                  id="batch-qr-count-input"
                  data-testid="batch-qr-count-input"
                  min="1"
                  max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateBatch}
              id="generate-batch-qrs-btn"
              data-testid="generate-batch-qrs-btn"
              disabled={generating}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {generateCount} QR Codes
                </>
              )}
            </button>

            {generatedCodes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Generated {generatedCodes.length} QR codes:
                  </span>
                </div>
                <div
                  id="generated-codes-list"
                  data-testid="generated-codes-list"
                  className="max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono grid grid-cols-2 gap-1 text-slate-700"
                >
                  {generatedCodes.map((code) => (
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

      {/* Manual Search Fallback */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Can't scan? Search Customer
          </label>
          <span className="text-[10px] text-slate-400">By Name, Phone, or QR</span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Rahul, 98765, or MM-QR-..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Autocomplete Results */}
        {searchResults.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {searchResults.map((cust) => (
              <div
                key={cust.id}
                onClick={() => {
                  if (cust.status === 'INACTIVE' || cust.active === false) {
                    setInactiveWarningCustomer(cust);
                  } else {
                    setSelectedCustomer(cust);
                  }
                }}
                className="p-3 hover:bg-brand-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                    {cust.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{cust.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {cust.mobile} {cust.address ? `• ${cust.address}` : ''}
                    </p>
                  </div>
                </div>
                <button className="text-xs font-bold text-brand-600 flex items-center gap-1">
                  Deliver <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal with Prefilled QR */}
      <AddCustomerModal
        isOpen={addCustomerModalOpen}
        initialQrCode={newCustomerQr}
        onClose={() => {
          setAddCustomerModalOpen(false);
          setNewCustomerQr(undefined);
        }}
        onSuccess={(cust) => {
          setSelectedCustomer(cust);
        }}
      />

      {/* Delivery Form Modal with Duplicate Warning */}
      {selectedCustomer && (
        <DeliveryModal
          customer={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSuccess={() => {
            navigate(`/customers/${selectedCustomer.id}`);
          }}
        />
      )}
    </div>
  );
};
