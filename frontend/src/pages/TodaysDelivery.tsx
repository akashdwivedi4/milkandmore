import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, Delivery } from '../types';
import { formatCurrency, formatTime } from '../utils/format';
import { MapComponent } from '../maps/MapComponent';
import {
  initAudioContext,
  playMissedCustomerTone,
  setAlertMuted,
  isAlertMuted,
} from '../utils/sound';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Plus,
  QrCode,
  Phone,
  MapPin,
  ChevronRight,
  Navigation,
  Play,
  Square,
  Map as MapIcon,
  List as ListIcon,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { DeliveryModal } from '../components/DeliveryModal';
import { useToast } from '../contexts/ToastContext';

export const TodaysDelivery: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'REMAINING' | 'DELIVERED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');

  // GPS Active Delivery Mode
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [detectionRadius, setDetectionRadius] = useState<number>(100); // 50m, 100m, 200m
  const [muted, setMuted] = useState(isAlertMuted());
  const [nearbyPending, setNearbyPending] = useState<any[]>([]);

  // Selected customer for delivery modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastNearbyCheckRef = useRef<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custRes, delivRes] = await Promise.all([
        api.getCustomers({ active: true, limit: 250 }),
        api.getDeliveries({ limit: 500 }),
      ]);

      if (custRes.success) setCustomers(custRes.data);
      if (delivRes.success) setTodayDeliveries(delivRes.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load delivery data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map deliveries by customer_id
  const deliveriesByCustomer = new Map<string, Delivery[]>();
  todayDeliveries.forEach((d) => {
    const arr = deliveriesByCustomer.get(d.customer_id) || [];
    arr.push(d);
    deliveriesByCustomer.set(d.customer_id, arr);
  });

  // Filter customers based on shift, search, and tab
  const shiftCustomers = customers.filter((c) => {
    const sched = c.deliverySchedule || c.delivery_schedule || 'MORNING';
    return sched === selectedShift || sched === 'BOTH';
  });

  const filteredCustomers = shiftCustomers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
      (c.locality && c.locality.toLowerCase().includes(search.toLowerCase()));

    const customerDeliveries = deliveriesByCustomer.get(c.id) || [];
    // Check if delivered in this shift
    const isDelivered = customerDeliveries.some((d: any) => d.shift === selectedShift || d.status === 'DELIVERED');

    if (!matchesSearch) return false;
    if (filterTab === 'REMAINING') return !isDelivered;
    if (filterTab === 'DELIVERED') return isDelivered;
    return true;
  });

  const deliveredCount = shiftCustomers.filter((c) => {
    const delivs = deliveriesByCustomer.get(c.id) || [];
    return delivs.some((d: any) => d.shift === selectedShift || d.status === 'DELIVERED');
  }).length;
  const remainingCount = Math.max(0, shiftCustomers.length - deliveredCount);

  // Toggle Mute
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAlertMuted(next);
  };

  // Start GPS Delivery Mode
  const startGpsDelivery = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    // Initialize audio context upon user tap to unlock browser audio restrictions
    initAudioContext();

    setIsGpsActive(true);
    showToast(`GPS Delivery Mode active for ${selectedShift} shift!`, 'success');

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentCoords([latitude, longitude]);
        setGpsAccuracy(Math.round(accuracy));

        // Throttle nearby API calls to once every 4 seconds
        const now = Date.now();
        if (now - lastNearbyCheckRef.current > 4000) {
          lastNearbyCheckRef.current = now;
          try {
            const res = await api.getNearbyCustomers(latitude, longitude, selectedShift, detectionRadius);
            if (res.success && res.data) {
              const pending = res.data.filter((c: any) => !c.isDelivered && c.status === 'PENDING');
              setNearbyPending(pending);

              // If any pending customer within detection radius, trigger tone
              if (pending.length > 0) {
                const nearest = pending[0];
                playMissedCustomerTone(nearest.customerId, 45); // 45s cooldown per customer
              }
            }
          } catch (err) {
            console.warn('Proximity check error:', err);
          }
        }
      },
      (err) => {
        console.warn('Geolocation watch error:', err);
        showToast('Unable to retrieve real-time location. Check GPS permissions.', 'error');
        stopGpsDelivery();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  };

  // Stop GPS Delivery Mode
  const stopGpsDelivery = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
    setNearbyPending([]);
    showToast('GPS Delivery Mode stopped', 'info');
  };

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Build map markers
  const mapMarkers = shiftCustomers
    .filter((c) => c.location?.coordinates && c.location.coordinates.length === 2)
    .map((c) => {
      const delivs = deliveriesByCustomer.get(c.id) || [];
      const isDeliv = delivs.some((d: any) => d.shift === selectedShift || d.status === 'DELIVERED');
      return {
        id: c.id,
        lat: c.location!.coordinates[1],
        lng: c.location!.coordinates[0],
        title: c.name,
        description: `${c.address || ''} • ${c.mobile}`,
        status: (isDeliv ? 'DELIVERED' : 'PENDING') as 'DELIVERED' | 'PENDING',
      };
    });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Header & Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Today's Delivery Route
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
              {selectedShift} SHIFT
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn-by-turn delivery tracking with instant doorstep proximity detection
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedShift('MORNING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedShift === 'MORNING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setSelectedShift('EVENING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedShift === 'EVENING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Evening
            </button>
          </div>

          {/* View Mode Toggle: List vs Map */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'MAP'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Interactive Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>

          <button
            onClick={() => navigate('/scan')}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </button>
        </div>
      </div>

      {/* GPS Active Mode Control Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isGpsActive
            ? 'bg-sky-50 border-sky-300 shadow-md ring-2 ring-sky-400/20'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                isGpsActive ? 'bg-sky-600 animate-pulse' : 'bg-slate-700'
              }`}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {isGpsActive ? 'GPS Delivery Mode: ACTIVE' : 'GPS Route Assistance'}
                </h3>
                {isGpsActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Tracking Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isGpsActive
                  ? `Accuracy: ±${gpsAccuracy || 10}m • Proximity Alert Radius: ${detectionRadius}m`
                  : 'Start real-time delivery mode with audio proximity chime and missed drop-off alerts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGpsActive && (
              <>
                {/* Detection Radius Selector */}
                <select
                  value={detectionRadius}
                  onChange={(e) => setDetectionRadius(Number(e.target.value))}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value={50}>50m Alert</option>
                  <option value={100}>100m Alert</option>
                  <option value={200}>200m Alert</option>
                </select>

                {/* Sound Mute Toggle */}
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-xl border transition-colors ${
                    muted
                      ? 'bg-slate-100 border-slate-300 text-slate-500'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                  title={muted ? 'Unmute Delivery Chime' : 'Mute Delivery Chime'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}

            {isGpsActive ? (
              <button
                onClick={stopGpsDelivery}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Delivery
              </button>
            ) : (
              <button
                onClick={startGpsDelivery}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Delivery Route
              </button>
            )}
          </div>
        </div>

        {/* Nearby Pending Customers Alert Banner */}
        {isGpsActive && nearbyPending.length > 0 && (
          <div className="mt-3 p-3 bg-amber-100/80 border border-amber-300 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-200 rounded-lg text-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {nearbyPending.length} Customer{nearbyPending.length > 1 ? 's' : ''} Nearby & Pending!
                </p>
                <p className="text-[11px] text-amber-800">
                  Nearest: <strong>{nearbyPending[0].name}</strong> ({nearbyPending[0].distanceMeters}m away)
                  {nearbyPending[0].address ? ` • ${nearbyPending[0].address}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const target = customers.find((c) => c.id === nearbyPending[0].customerId);
                if (target) setSelectedCustomer(target);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs shrink-0"
            >
              Deliver Now
            </button>
          </div>
        )}
      </div>

      {/* Map View Mode */}
      {viewMode === 'MAP' && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Route Map: {selectedShift} Shift
              </h3>
              <p className="text-[11px] text-slate-500">
                Green pins = Delivered, Amber pins = Pending, Blue dot = Current Location
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {mapMarkers.length} Mapped Stops
            </span>
          </div>

          <MapComponent
            center={currentCoords || (mapMarkers[0] ? [mapMarkers[0].lat, mapMarkers[0].lng] : [23.1815, 79.9864])}
            zoom={14}
            markers={mapMarkers}
            userLocation={currentCoords}
            className="h-96 w-full rounded-xl overflow-hidden border border-slate-200"
            onMarkerClick={(marker) => {
              const cust = customers.find((c) => c.id === marker.id);
              if (cust) setSelectedCustomer(cust);
            }}
          />
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${selectedShift.toLowerCase()} customers by name, phone, or locality...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Stops ({shiftCustomers.length})
          </button>
          <button
            onClick={() => setFilterTab('REMAINING')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filterTab === 'REMAINING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Remaining ({remainingCount})
          </button>
          <button
            onClick={() => setFilterTab('DELIVERED')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filterTab === 'DELIVERED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Delivered ({deliveredCount})
          </button>
        </div>
      </div>

      {/* Customer Delivery List & Table */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2E7D32]" />
            <p className="text-xs font-semibold">Loading delivery route...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No scheduled customers found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No customers scheduled for {selectedShift.toLowerCase()} shift matching your filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Dense Delivery Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Contact & Address</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Drop Details</th>
                    <th className="py-2.5 px-3 text-center">Account</th>
                    <th className="py-2.5 px-3 text-right">Delivery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCustomers.map((customer, idx) => {
                    const deliveries = deliveriesByCustomer.get(customer.id) || [];
                    const isDelivered = deliveries.some(
                      (d: any) => d.shift === selectedShift || d.status === 'DELIVERED'
                    );
                    const latestDelivery = isDelivered ? deliveries[0] : null;

                    return (
                      <tr
                        key={customer.id}
                        className={`transition-colors ${
                          isDelivered ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-amber-50/40'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="font-bold text-slate-900 hover:text-sky-700 cursor-pointer flex items-center gap-2"
                          >
                            <div
                              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isDelivered ? <CheckCircle2 className="w-3.5 h-3.5" /> : customer.name[0]}
                            </div>
                            <span>{customer.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-slate-700 font-mono text-[11px]">{customer.mobile}</div>
                          <div className="text-slate-500 text-[11px] truncate max-w-xs" title={customer.address || ''}>
                            {customer.address || customer.locality || '—'}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isDelivered ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Delivered ({deliveries.length}x)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {latestDelivery ? (
                            <span className="text-emerald-700 font-semibold">
                              {formatTime(latestDelivery.delivered_at)} • {formatCurrency(latestDelivery.total_amount)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not recorded yet</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => navigate(`/accounts?customerId=${customer.id}`)}
                            className="px-2 py-1 rounded bg-[#6B1724] hover:bg-[#52121b] text-white text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition-colors"
                            title="Open Customer Account"
                          >
                            <Calculator className="w-3 h-3 text-amber-300" />
                            <span>Account</span>
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedCustomer(customer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isDelivered ? 'Add Another' : 'Add Delivery'}</span>
                            </button>
                            <button
                              onClick={() => navigate(`/customers/${customer.id}`)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                              title="Customer Details"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Screen < md) */}
            <div className="md:hidden space-y-2.5">
              {filteredCustomers.map((customer) => {
                const deliveries = deliveriesByCustomer.get(customer.id) || [];
                const isDelivered = deliveries.some(
                  (d: any) => d.shift === selectedShift || d.status === 'DELIVERED'
                );
                const latestDelivery = isDelivered ? deliveries[0] : null;

                return (
                  <div
                    key={customer.id}
                    className={`bg-white rounded-xl p-3.5 border transition-all shadow-xs space-y-2.5 ${
                      isDelivered ? 'border-emerald-200/80 bg-emerald-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Customer Details */}
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isDelivered ? <CheckCircle2 className="w-4 h-4" /> : customer.name[0]}
                      </div>

                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">{customer.name}</h3>
                          {isDelivered ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                              Delivered ({deliveries.length}x)
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{customer.mobile}</span>
                          {customer.address && <span>• {customer.address}</span>}
                        </div>

                        {latestDelivery && (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Last drop: {formatTime(latestDelivery.delivered_at)} ({formatCurrency(latestDelivery.total_amount)})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/accounts?customerId=${customer.id}`)}
                        className="px-2 py-1 rounded bg-[#6B1724] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                      >
                        <Calculator className="w-3.5 h-3.5 text-amber-300" />
                        <span>Account</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isDelivered ? 'Add Another' : 'Add Delivery'}</span>
                        </button>

                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Open Customer Profile"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delivery Modal */}
      {selectedCustomer && (
        <DeliveryModal
          customer={selectedCustomer}
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

