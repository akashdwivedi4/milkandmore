import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Truck,
  FileText,
  LogOut,
  Clock,
  ArrowRight,
  RefreshCw,
  Milk,
  Receipt,
  User,
  MapPin,
  Phone,
  Info,
} from 'lucide-react';

interface PortalInfo {
  valid: boolean;
  maskedMobile: string;
  businessName: string;
  token: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  active: boolean;
  balance: number;
  deliverySchedule?: {
    morningQuantity: number;
    eveningQuantity: number;
    enabled: boolean;
  };
}

interface TodayDelivery {
  date: string;
  delivered: boolean;
  shifts: {
    morning?: { status: string; items: any[]; totalAmount: number };
    evening?: { status: string; items: any[]; totalAmount: number };
  };
}

export const CustomerPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  // Verification state
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(true);
  const [invalidTokenError, setInvalidTokenError] = useState<string | null>(null);

  // OTP state
  const [otpRequested, setOtpRequested] = useState<boolean>(false);
  const [otpValue, setOtpValue] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [requestingOtp, setRequestingOtp] = useState<boolean>(false);
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  // Verified session & customer data
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return sessionStorage.getItem(`mm_cust_session_${token}`) || null;
  });

  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [todayDelivery, setTodayDelivery] = useState<TodayDelivery | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'DELIVERIES' | 'PAYMENTS' | 'STATEMENT'>('DELIVERIES');

  // Format currency
  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Load Portal Info on mount
  useEffect(() => {
    if (!token) {
      setInvalidTokenError('Invalid or missing QR link.');
      setLoadingInfo(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        setLoadingInfo(true);
        setInvalidTokenError(null);
        const res = await api.getCustomerPortalInfo(token);
        if (res.success && res.data) {
          setPortalInfo(res.data);
        } else {
          setInvalidTokenError('Invalid or expired QR code.');
        }
      } catch (err: any) {
        setInvalidTokenError(
          err.message || 'Invalid or expired QR code. Please contact your dairy provider.'
        );
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInfo();
  }, [token]);

  // Load Dashboard Data once sessionToken is present
  const loadDashboardData = useCallback(async (st: string) => {
    try {
      setLoadingDashboard(true);
      const [profileRes, todayRes, deliveriesRes, paymentsRes, statementRes] = await Promise.allSettled([
        api.getCustomerPortalProfile(st),
        api.getCustomerPortalToday(st),
        api.getCustomerPortalDeliveries(st),
        api.getCustomerPortalPayments(st),
        api.getCustomerPortalStatement(st),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.success) {
        setCustomerProfile(profileRes.value.data);
      } else if (profileRes.status === 'rejected' || (profileRes.status === 'fulfilled' && !profileRes.value.success)) {
        // Session might be expired or invalid
        handleLogout();
        return;
      }

      if (todayRes.status === 'fulfilled' && todayRes.value.success) {
        setTodayDelivery(todayRes.value.data);
      }
      if (deliveriesRes.status === 'fulfilled' && deliveriesRes.value.success) {
        setDeliveries(deliveriesRes.value.data.items || []);
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.success) {
        setPayments(paymentsRes.value.data || []);
      }
      if (statementRes.status === 'fulfilled' && statementRes.value.success) {
        setStatement(statementRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    if (sessionToken && portalInfo) {
      loadDashboardData(sessionToken);
    }
  }, [sessionToken, portalInfo, loadDashboardData]);

  // Request OTP
  const handleRequestOtp = async () => {
    if (!token || cooldown > 0 || requestingOtp) return;
    try {
      setRequestingOtp(true);
      setOtpError(null);
      setOtpSuccessMessage(null);

      const res = await api.requestCustomerPortalOtp(token);
      if (res.success) {
        setOtpRequested(true);
        setOtpSuccessMessage(res.message || 'OTP sent successfully.');
        setCooldown(res.cooldownSeconds || 60);
      }
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setRequestingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !otpValue.trim() || verifyingOtp) return;

    if (otpValue.trim().length !== 6) {
      setOtpError('Please enter a 6-digit OTP.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);

      const res = await api.verifyCustomerPortalOtp(token, otpValue.trim());
      if (res.success && res.sessionToken) {
        sessionStorage.setItem(`mm_cust_session_${token}`, res.sessionToken);
        setSessionToken(res.sessionToken);
      } else {
        setOtpError(res.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect OTP. Please check and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await api.customerPortalLogout();
    } catch {
      // Ignore
    } finally {
      if (token) {
        sessionStorage.removeItem(`mm_cust_session_${token}`);
      }
      setSessionToken(null);
      setCustomerProfile(null);
      setOtpRequested(false);
      setOtpValue('');
      setOtpError(null);
      setOtpSuccessMessage(null);
    }
  };

  // Loading initial info
  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Verifying secure portal link...</p>
        </div>
      </div>
    );
  }

  // Error / Invalid token
  if (invalidTokenError || !portalInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Invalid or Expired QR Link</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {invalidTokenError ||
                'This QR code is not registered or has been revoked. Please reach out to your milk delivery person.'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 text-left space-y-1">
            <p className="font-semibold text-slate-700">Need help?</p>
            <p>If you recently moved or requested a new QR tag, ask the dairy owner to regenerate your QR card.</p>
          </div>
        </div>
      </div>
    );
  }

  // PHASE 1: OTP Verification Screen (ZERO PII EXPOSED)
  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-sky-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-md w-full space-y-6">
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/25 mb-1">
              <Milk className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {portalInfo.businessName || 'Milk & More'}
            </h1>
            <p className="text-xs uppercase tracking-wider font-extrabold text-brand-600">
              Customer Secure Portal
            </p>
          </div>

          {/* Verification Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified QR Link
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verify Your Account</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                We found your Milk & More account. To protect your privacy and personal delivery records, please verify your mobile number.
              </p>
            </div>

            {/* Masked identifier note */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-left flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-sky-950">
                  Registered Mobile Number
                </p>
                <p className="text-sm font-bold text-brand-700 tracking-wide">
                  {portalInfo.maskedMobile}
                </p>
                <p className="text-[11px] text-sky-700">
                  A 6-digit one-time password (OTP) will be sent to this number.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {/* Success Message */}
            {otpSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {!otpRequested ? (
              /* Request OTP Action */
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={requestingOtp}
                  className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {requestingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP to My Phone
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Standard SMS rates may apply.
                </p>
              </div>
            ) : (
              /* Verify OTP Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Enter 6-digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 px-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 font-bold"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 text-center">
                    OTP is valid for 5 minutes. Never share it with anyone.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={verifyingOtp || otpValue.trim().length !== 6}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {verifyingOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Access Account
                        <Lock className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Resend Button / Cooldown */}
                  <div className="text-center pt-2">
                    {cooldown > 0 ? (
                      <span className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Resend OTP in {cooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={requestingOtp}
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Secured by Milk & More Privacy Guard &bull; IDOR Protected
          </p>
        </div>
      </div>
    );
  }

  // PHASE 2: Verified Customer Dashboard
  const outstandingAmount = statement?.netBalanceDue ?? customerProfile?.balance ?? 0;
  const isDue = outstandingAmount > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Milk className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {portalInfo.businessName || 'Milk & More'}
              </h1>
              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                Customer Portal
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {loadingDashboard ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading your account details...</p>
          </div>
        ) : (
          <>
            {/* Customer Welcome & Identity Card */}
            {customerProfile && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{customerProfile.name}</h2>
                      {customerProfile.active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {customerProfile.mobile}
                      </span>
                      {customerProfile.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {customerProfile.address}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-black text-lg border border-brand-100 shrink-0">
                    {customerProfile.name.charAt(0)}
                  </div>
                </div>

                {customerProfile.deliverySchedule?.enabled && (
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="text-slate-400">Regular Schedule:</span>
                    {customerProfile.deliverySchedule.morningQuantity > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        Morning: {customerProfile.deliverySchedule.morningQuantity} L
                      </span>
                    )}
                    {customerProfile.deliverySchedule.eveningQuantity > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                        Evening: {customerProfile.deliverySchedule.eveningQuantity} L
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Outstanding Balance Highlight Card */}
            <div
              className={`rounded-3xl p-5 border shadow-xs ${
                isDue
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    {isDue ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span className="text-rose-700">Outstanding Balance Due</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Account Up to Date</span>
                      </>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight">
                    {formatCurrency(Math.abs(outstandingAmount))}
                  </div>
                  <p className="text-xs text-slate-600">
                    {isDue
                      ? 'Please clear your balance with your delivery person or via UPI.'
                      : outstandingAmount < 0
                      ? 'Advance payment credit balance on account.'
                      : 'No outstanding dues on this account.'}
                  </p>
                </div>

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Today's Delivery Card */}
            {todayDelivery && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Today&apos;s Delivery Status</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{todayDelivery.date}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Morning Shift */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">Morning Shift</span>
                      {todayDelivery.shifts?.morning ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {todayDelivery.shifts.morning.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Pending / None
                        </span>
                      )}
                    </div>
                    {todayDelivery.shifts?.morning?.items?.length ? (
                      <div className="space-y-1 text-xs">
                        {todayDelivery.shifts.morning.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>{it.productName || 'Milk'} ({it.quantity} {it.unit || 'L'})</span>
                            <span className="font-bold text-slate-800">{formatCurrency(it.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">No delivery logged for morning</p>
                    )}
                  </div>

                  {/* Evening Shift */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">Evening Shift</span>
                      {todayDelivery.shifts?.evening ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {todayDelivery.shifts.evening.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          Pending / None
                        </span>
                      )}
                    </div>
                    {todayDelivery.shifts?.evening?.items?.length ? (
                      <div className="space-y-1 text-xs">
                        {todayDelivery.shifts.evening.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>{it.productName || 'Milk'} ({it.quantity} {it.unit || 'L'})</span>
                            <span className="font-bold text-slate-800">{formatCurrency(it.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">No delivery logged for evening</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex bg-slate-200/70 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('DELIVERIES')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'DELIVERIES'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivery History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PAYMENTS')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'PAYMENTS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Payment History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STATEMENT')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'STATEMENT'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Statement / Bill
              </button>
            </div>

            {/* Tab 1: Delivery History */}
            {activeTab === 'DELIVERIES' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Deliveries</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing latest {deliveries.length} entries
                  </span>
                </div>

                {deliveries.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No delivery records found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {deliveries.map((del) => (
                      <div key={del.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {del.date ? new Date(del.date).toLocaleDateString('en-IN') : 'N/A'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {del.shift}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            {del.items?.map((it: any) => `${it.productName || 'Milk'} (${it.quantity} ${it.unit || 'L'})`).join(', ') || 'Milk Delivery'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(del.totalAmount)}
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            {del.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Payment History */}
            {activeTab === 'PAYMENTS' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Payment Records</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {payments.length} payments recorded
                  </span>
                </div>

                {payments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No payment records found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : 'N/A'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                              {p.paymentMode || 'CASH'}
                            </span>
                          </div>
                          {p.referenceNumber && (
                            <p className="text-slate-400 text-[10px] font-mono">
                              Ref: {p.referenceNumber}
                            </p>
                          )}
                          {p.notes && <p className="text-slate-500 text-[11px]">{p.notes}</p>}
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-600 text-sm">
                            +{formatCurrency(p.amount)}
                          </span>
                          <span className="block text-[10px] text-slate-400">Received</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Statement / Bill */}
            {activeTab === 'STATEMENT' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-sm">Account Statement Summary</h3>
                    <p className="text-xs text-slate-500">Live ledger balance overview</p>
                  </div>
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>

                {statement ? (
                  <div className="space-y-4">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Total Deliveries Amount</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(statement.totalDeliveriesAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Total Payments Received</span>
                        <span className="font-bold text-emerald-600">
                          -{formatCurrency(statement.totalPaymentsAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 text-sm font-bold bg-slate-50 px-3 rounded-xl">
                        <span className="text-slate-800">Current Balance / Outstanding</span>
                        <span className={statement.netBalanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {formatCurrency(statement.netBalanceDue || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <p>
                        For any billing questions or discrepancies, please contact your delivery representative or dairy manager.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No statement data available.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
