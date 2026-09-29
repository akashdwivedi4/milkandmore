import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  TrialBalanceData,
  ProfitAndLossData,
  BalanceSheetData,
  CashBookData,
  BankUpiLedgerData,
  DayBookData,
  ChartAccount,
  JournalEntry,
  ReceivableAgeingData,
  PayableAgeingData,
} from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import {
  Scale,
  Calendar,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  ArrowRightLeft,
  BookOpen,
  Receipt,
  FileText,
  Search,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Truck,
  ExternalLink,
} from 'lucide-react';

export type FinancialTab =
  | 'chart'
  | 'journal'
  | 'ledger'
  | 'trial_balance'
  | 'pnl'
  | 'balance_sheet'
  | 'cash_bank'
  | 'day_book'
  | 'ageing';

export const Financials: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as FinancialTab | null;
  const initialTab: FinancialTab =
    tabParam &&
    [
      'chart',
      'journal',
      'ledger',
      'trial_balance',
      'pnl',
      'balance_sheet',
      'cash_bank',
      'day_book',
      'ageing',
    ].includes(tabParam)
      ? tabParam
      : 'ledger';

  const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab);
  const [loading, setLoading] = useState(false);

  // Sync tab with URL search parameter
  useEffect(() => {
    const currentTabParam = searchParams.get('tab') as FinancialTab | null;
    const validTabs: FinancialTab[] = [
      'chart',
      'journal',
      'ledger',
      'trial_balance',
      'pnl',
      'balance_sheet',
      'cash_bank',
      'day_book',
      'ageing',
    ];
    if (currentTabParam && validTabs.includes(currentTabParam) && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: FinancialTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Date helpers
  const getLocalToday = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  const getLocalMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // Chart of Accounts state
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartAccount[]>([]);
  const [chartSearch, setChartSearch] = useState('');
  const [chartCategoryFilter, setChartCategoryFilter] = useState<
    'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  >('ALL');

  // General Ledger state
  const [selectedAccount, setSelectedAccount] = useState<string>('1010');
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Journal Entries state
  const [journalStartDate, setJournalStartDate] = useState(getLocalMonthStart());
  const [journalEndDate, setJournalEndDate] = useState(getLocalToday());
  const [journalSourceType, setJournalSourceType] = useState<string>('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalSearch, setJournalSearch] = useState('');
  const [expandedJournalEntries, setExpandedJournalEntries] = useState<Record<string, boolean>>({});

  // Trial Balance state
  const [trialBalanceDate, setTrialBalanceDate] = useState(getLocalToday());
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);

  // P&L state
  const [pnlStartDate, setPnlStartDate] = useState(getLocalMonthStart());
  const [pnlEndDate, setPnlEndDate] = useState(getLocalToday());
  const [pnl, setPnl] = useState<ProfitAndLossData | null>(null);

  // Balance Sheet state
  const [sheetDate, setSheetDate] = useState(getLocalToday());
  const [sheet, setSheet] = useState<BalanceSheetData | null>(null);

  // Cash & Bank Book state
  const [cashBook, setCashBook] = useState<CashBookData | null>(null);
  const [bankLedger, setBankLedger] = useState<BankUpiLedgerData | null>(null);
  const [upiLedger, setUpiLedger] = useState<BankUpiLedgerData | null>(null);

  // Day Book state
  const [dayBookDate, setDayBookDate] = useState(getLocalToday());
  const [dayBook, setDayBook] = useState<DayBookData | null>(null);

  // Ageing Analysis state
  const [ageingType, setAgeingType] = useState<'RECEIVABLES' | 'PAYABLES'>('RECEIVABLES');
  const [receivableAgeing, setReceivableAgeing] = useState<ReceivableAgeingData | null>(null);
  const [payableAgeing, setPayableAgeing] = useState<PayableAgeingData | null>(null);
  const [ageingSearch, setAgeingSearch] = useState('');

  // Internal Transfer Modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<'CASH' | 'BANK' | 'UPI'>('CASH');
  const [transferTo, setTransferTo] = useState<'CASH' | 'BANK' | 'UPI'>('BANK');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Load Chart of Accounts once
  useEffect(() => {
    api
      .getChartOfAccounts()
      .then((res) => {
        if (res.success && res.data) {
          setChartOfAccounts(res.data);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch data depending on active tab
  const fetchTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'chart') {
        const res = await api.getChartOfAccounts();
        if (res.success && res.data) setChartOfAccounts(res.data);
      } else if (activeTab === 'journal') {
        const res = await api.getJournalEntries({
          startDate: journalStartDate,
          endDate: journalEndDate,
          sourceType: journalSourceType || undefined,
        });
        if (res.success && res.data) setJournalEntries(res.data);
      } else if (activeTab === 'ledger') {
        const res = await api.getGeneralLedger({ accountCode: selectedAccount });
        if (res.success) setLedgerData(res.data);
      } else if (activeTab === 'trial_balance') {
        const res = await api.getTrialBalance(trialBalanceDate);
        if (res.success) setTrialBalance(res.data);
      } else if (activeTab === 'pnl') {
        const res = await api.getProfitAndLoss(pnlStartDate, pnlEndDate);
        if (res.success) setPnl(res.data);
      } else if (activeTab === 'balance_sheet') {
        const res = await api.getBalanceSheet(sheetDate);
        if (res.success) setSheet(res.data);
      } else if (activeTab === 'cash_bank') {
        const [cRes, bRes, uRes] = await Promise.all([
          api.getCashBook(),
          api.getBankUpiLedger('BANK'),
          api.getBankUpiLedger('UPI'),
        ]);
        if (cRes.success) setCashBook(cRes.data);
        if (bRes.success) setBankLedger(bRes.data);
        if (uRes.success) setUpiLedger(uRes.data);
      } else if (activeTab === 'day_book') {
        const res = await api.getDayBook(dayBookDate);
        if (res.success) setDayBook(res.data);
      } else if (activeTab === 'ageing') {
        const [rRes, pRes] = await Promise.all([
          api.getReceivableAgeing(),
          api.getPayableAgeing(),
        ]);
        if (rRes.success) setReceivableAgeing(rRes.data);
        if (pRes.success) setPayableAgeing(pRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load accounting data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [
    activeTab,
    selectedAccount,
    trialBalanceDate,
    pnlStartDate,
    pnlEndDate,
    sheetDate,
    dayBookDate,
    journalStartDate,
    journalEndDate,
    journalSourceType,
  ]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid transfer amount.', 'error');
      return;
    }
    if (transferFrom === transferTo) {
      showToast('Source and destination accounts must be different.', 'error');
      return;
    }

    try {
      setSubmittingTransfer(true);
      const res = await api.recordTransfer({
        fromAccount: transferFrom,
        toAccount: transferTo,
        amount: amt,
        notes: transferNotes.trim() || undefined,
      });

      if (res.success) {
        showToast(res.message || 'Internal transfer recorded successfully!', 'success');
        setTransferModalOpen(false);
        setTransferAmount('');
        setTransferNotes('');
        fetchTabData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record transfer', 'error');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Filtered Chart of Accounts
  const filteredChartAccounts = chartOfAccounts.filter((acc) => {
    const matchesCat = chartCategoryFilter === 'ALL' || acc.type === chartCategoryFilter;
    const term = chartSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term) ||
      acc.type.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });

  // Filtered Journal Entries
  const filteredJournalEntries = journalEntries.filter((je) => {
    const term = journalSearch.toLowerCase().trim();
    if (!term) return true;
    const matchesVoucher = je.entryNumber?.toLowerCase().includes(term);
    const matchesNarration = je.narration?.toLowerCase().includes(term);
    const matchesParty = je.lines?.some((l) => l.partyName?.toLowerCase().includes(term));
    return matchesVoucher || matchesNarration || matchesParty;
  });

  // Filtered Ageing Customers
  const filteredReceivableCustomers = (receivableAgeing?.customers || []).filter((c) => {
    const term = ageingSearch.toLowerCase().trim();
    if (!term) return true;
    return c.name.toLowerCase().includes(term) || c.mobile?.toLowerCase().includes(term);
  });

  // Filtered Ageing Suppliers
  const filteredPayableSuppliers = (payableAgeing?.suppliers || []).filter((s) => {
    const term = ageingSearch.toLowerCase().trim();
    if (!term) return true;
    return s.name.toLowerCase().includes(term) || s.mobile?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      {/* Compact ERP Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6B1724]/10 text-[#6B1724] flex items-center justify-center font-bold shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                Books of Accounts & Financials
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#2E7D32] border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Balanced Books
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Double-Entry General Ledger, Journal Vouchers, Trial Balance, P&L, Balance Sheet & Registers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6B1724] hover:bg-[#55121D] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Internal Transfer</span>
          </button>
        </div>
      </div>

      {/* Financial Sub-Navigation Tabs - Compact ERP Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 text-xs">
        {[
          { id: 'chart', label: 'Chart of Accounts', icon: FolderTree },
          { id: 'journal', label: 'Journal Entries', icon: FileText },
          { id: 'ledger', label: 'General Ledger', icon: BookOpen },
          { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
          { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: Building },
          { id: 'cash_bank', label: 'Cash & Bank', icon: Wallet },
          { id: 'day_book', label: 'Day Book', icon: Calendar },
          { id: 'ageing', label: 'Ageing Analysis', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#2E7D32] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500 gap-2 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2E7D32]" />
          <span className="text-xs font-semibold">Computing verified dairy accounting books...</span>
        </div>
      )}

      {/* TAB: CHART OF ACCOUNTS */}
      {!loading && activeTab === 'chart' && (
        <div className="space-y-3">
          {/* Compact Filter and Search Toolbar */}
          <div className="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search account code or name..."
                  value={chartSearch}
                  onChange={(e) => setChartSearch(e.target.value)}
                  className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 w-56 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                />
              </div>

              {/* Compact Category Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs overflow-x-auto">
                {(['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setChartCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all text-[11px] cursor-pointer ${
                      chartCategoryFilter === cat
                        ? 'bg-white text-[#2E7D32] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Accounts' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-500">
              Showing <strong className="text-slate-900">{filteredChartAccounts.length}</strong> dairy accounts
            </div>
          </div>

          {/* Compact Category Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                type: 'ASSET',
                label: 'Assets',
                count: chartOfAccounts.filter((a) => a.type === 'ASSET').length,
                border: 'border-blue-200 bg-blue-50/60 text-blue-900',
              },
              {
                type: 'LIABILITY',
                label: 'Liabilities',
                count: chartOfAccounts.filter((a) => a.type === 'LIABILITY').length,
                border: 'border-amber-200 bg-amber-50/60 text-amber-900',
              },
              {
                type: 'EQUITY',
                label: 'Equity',
                count: chartOfAccounts.filter((a) => a.type === 'EQUITY').length,
                border: 'border-purple-200 bg-purple-50/60 text-purple-900',
              },
              {
                type: 'INCOME',
                label: 'Income',
                count: chartOfAccounts.filter((a) => a.type === 'INCOME').length,
                border: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
              },
              {
                type: 'EXPENSE',
                label: 'Expenses',
                count: chartOfAccounts.filter((a) => a.type === 'EXPENSE').length,
                border: 'border-rose-200 bg-rose-50/60 text-rose-900',
              },
            ].map((cat) => (
              <div
                key={cat.type}
                onClick={() => setChartCategoryFilter(cat.type as any)}
                className={`p-2 px-3 rounded-lg border cursor-pointer hover:bg-white transition-colors flex items-center justify-between ${cat.border}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">{cat.label}</span>
                <span className="text-sm font-black font-mono">{cat.count}</span>
              </div>
            ))}
          </div>

          {/* Dense Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 select-none">
                  <th className="py-2 px-3 border-r border-slate-200 w-28">Account Code</th>
                  <th className="py-2 px-3 border-r border-slate-200">Account Title</th>
                  <th className="py-2 px-3 border-r border-slate-200 w-32">Classification</th>
                  <th className="py-2 px-3 border-r border-slate-200 w-32">Normal Balance</th>
                  <th className="py-2 px-3 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChartAccounts.length > 0 ? (
                  filteredChartAccounts.map((acc: any) => (
                    <tr key={acc.code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-100">{acc.code}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800 border-r border-slate-100">{acc.name}</td>
                      <td className="py-1.5 px-3 border-r border-slate-100">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.type === 'ASSET'
                              ? 'bg-blue-100 text-blue-800'
                              : acc.type === 'LIABILITY'
                              ? 'bg-amber-100 text-amber-800'
                              : acc.type === 'EQUITY'
                              ? 'bg-purple-100 text-purple-800'
                              : acc.type === 'INCOME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 font-medium border-r border-slate-100">
                        {acc.type === 'ASSET' || acc.type === 'EXPENSE' ? 'Debit (Dr)' : 'Credit (Cr)'}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedAccount(acc.code);
                            handleTabChange('ledger');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[11px] transition-colors cursor-pointer"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs italic">
                      No accounts found matching "{chartSearch}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: JOURNAL ENTRIES */}
      {!loading && activeTab === 'journal' && (
        <div className="space-y-3">
          <div className="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-500">From:</span>
                <input
                  type="date"
                  value={journalStartDate}
                  onChange={(e) => setJournalStartDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                />
                <span className="text-[11px] text-slate-500">To:</span>
                <input
                  type="date"
                  value={journalEndDate}
                  onChange={(e) => setJournalEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>

              <select
                value={journalSourceType}
                onChange={(e) => setJournalSourceType(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              >
                <option value="">All Source Types</option>
                <option value="DELIVERY">Delivery</option>
                <option value="PAYMENT">Customer Payment</option>
                <option value="CUSTOMER_ADVANCE">Customer Advance</option>
                <option value="CUSTOMER_REFUND">Customer Refund</option>
                <option value="PURCHASE">Milk Purchase</option>
                <option value="PURCHASE_RETURN">Purchase Return</option>
                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                <option value="EXPENSE">Expense</option>
                <option value="TRANSFER">Internal Transfer</option>
                <option value="OPENING_BALANCE">Opening Balance</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter voucher or narration..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-[11px] text-slate-500 font-semibold">
                Total Vouchers: <strong className="text-slate-900">{filteredJournalEntries.length}</strong>
              </span>
              <button
                onClick={() => {
                  const allExpanded = filteredJournalEntries.every(
                    (je: any) => expandedJournalEntries[je.entryNumber]
                  );
                  const nextState: Record<string, boolean> = {};
                  filteredJournalEntries.forEach((je: any) => {
                    nextState[je.entryNumber] = !allExpanded;
                  });
                  setExpandedJournalEntries(nextState);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                Toggle Details
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredJournalEntries.length > 0 ? (
              filteredJournalEntries.map((je: any) => {
                const isExpanded = expandedJournalEntries[je.entryNumber] !== false;
                return (
                  <div
                    key={je.entryNumber || je._id}
                    className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2 transition-all hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {je.entryNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            je.sourceType === 'DELIVERY'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : je.sourceType === 'PAYMENT'
                              ? 'bg-emerald-50 text-[#2E7D32] border-emerald-200'
                              : je.sourceType === 'CUSTOMER_ADVANCE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : je.sourceType === 'CUSTOMER_REFUND'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : je.sourceType === 'PURCHASE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : je.sourceType === 'PURCHASE_RETURN'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : je.sourceType === 'TRANSFER'
                              ? 'bg-[#6B1724]/10 text-[#6B1724] border-[#6B1724]/20'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {je.sourceType}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#2E7D32] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Balanced ({formatCurrency(je.totalDebit)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDate(je.date)}</span>
                        <button
                          onClick={() =>
                            setExpandedJournalEntries((prev) => ({
                              ...prev,
                              [je.entryNumber]: !isExpanded,
                            }))
                          }
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">{je.narration}</p>

                    {isExpanded && (
                      <div className="bg-slate-50 rounded-lg p-2.5 divide-y divide-slate-200/60 overflow-hidden">
                        <div className="pb-1.5 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>Account & Party Details</span>
                          <div className="flex gap-8 text-right pr-2">
                            <span className="w-24">Debit (Dr)</span>
                            <span className="w-24">Credit (Cr)</span>
                          </div>
                        </div>
                        {je.lines.map((l: any, lineIdx: number) => (
                          <div key={lineIdx} className="py-1.5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-mono font-bold text-slate-700 mr-2">{l.accountCode}</span>
                              <span className="font-semibold text-slate-900">{l.accountName}</span>
                              {l.partyName && (
                                <span className="text-[10px] text-slate-600 ml-2 font-medium bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                  {l.partyName}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-8 font-mono font-bold text-right">
                              <span className={`w-24 ${l.debit > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                {l.debit > 0 ? formatCurrency(l.debit) : '-'}
                              </span>
                              <span className={`w-24 ${l.credit > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                {l.credit > 0 ? formatCurrency(l.credit) : '-'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-400 text-xs italic">
                No journal entries found matching criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: GENERAL LEDGER */}
      {!loading && activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Account:</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
              >
                {chartOfAccounts.map((acc: any) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {ledgerData && (
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-slate-500">
                  Debits: <strong className="text-slate-900 font-mono">{formatCurrency(ledgerData.totalDebit || 0)}</strong>
                </span>
                <span className="text-slate-500">
                  Credits: <strong className="text-slate-900 font-mono">{formatCurrency(ledgerData.totalCredit || 0)}</strong>
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-[#2E7D32] rounded-lg font-black font-mono text-xs">
                  Closing: {formatCurrency(ledgerData.closingBalance || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 select-none">
                    <th className="py-2 px-3 border-r border-slate-200 w-24">Date</th>
                    <th className="py-2 px-3 border-r border-slate-200 w-28">Voucher No</th>
                    <th className="py-2 px-3 border-r border-slate-200">Particulars & Narration</th>
                    <th className="py-2 px-3 border-r border-slate-200 w-28">Type</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right w-28">Debit (Dr)</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right w-28">Credit (Cr)</th>
                    <th className="py-2 px-3 text-right w-32">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData && ledgerData.entries && ledgerData.entries.length > 0 ? (
                    ledgerData.entries.map((e: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">{formatDate(e.date)}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">{e.entryNumber}</td>
                        <td className="py-1.5 px-3 text-slate-800 max-w-xs truncate border-r border-slate-100" title={e.narration}>
                          {e.narration}
                          {e.partyName && (
                            <span className="block text-[10px] text-slate-400 font-normal">Party: {e.partyName}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {e.sourceType}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-black text-[#2E7D32] whitespace-nowrap">
                          {formatCurrency(e.runningBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs italic">
                        No transactions found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRIAL BALANCE */}
      {!loading && activeTab === 'trial_balance' && trialBalance && (
        <div className="space-y-3">
          <div className="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">As of Date:</label>
              <input
                type="date"
                value={trialBalanceDate}
                onChange={(e) => setTrialBalanceDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              {trialBalance.isBalanced ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-[#2E7D32] rounded-lg text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Books In Balance: Total Debits == Total Credits</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Mismatch detected! Difference: {formatCurrency(trialBalance.difference)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 select-none">
                  <th className="py-2 px-3 border-r border-slate-200 w-28">Account Code</th>
                  <th className="py-2 px-3 border-r border-slate-200">Account Name</th>
                  <th className="py-2 px-3 border-r border-slate-200 w-32">Classification</th>
                  <th className="py-2 px-3 border-r border-slate-200 text-right w-36">Debit (Dr)</th>
                  <th className="py-2 px-3 text-right w-36">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.accounts.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-100">{row.code}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800 border-r border-slate-100">{row.name}</td>
                    <td className="py-1.5 px-3 border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-100">
                      {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#0f172a] text-white font-black text-xs border-t-2 border-slate-800">
                  <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider">
                    Grand Total
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">
                    {formatCurrency(trialBalance.grandTotalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">
                    {formatCurrency(trialBalance.grandTotalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS */}
      {!loading && activeTab === 'pnl' && pnl && (
        <div className="space-y-3">
          {/* P&L Filter Toolbar */}
          <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Period:</span>
              <input
                type="date"
                value={pnlStartDate}
                onChange={(e) => setPnlStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={pnlEndDate}
                onChange={(e) => setPnlEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 rounded border font-mono font-bold text-xs flex items-center gap-2 ${
                  pnl.netProfit >= 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {pnl.netProfit >= 0 ? 'Net Profit:' : 'Net Loss:'}
                </span>
                <span className="text-sm font-black">{formatCurrency(pnl.netProfit)}</span>
              </div>
            </div>
          </div>

          {/* Side-by-side Revenue and Expenses breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Revenue Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-3.5 py-2 bg-[#2E7D32]/10 border-b border-[#2E7D32]/20 flex justify-between items-center">
                  <span className="font-bold text-[#2E7D32] text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Operating Revenue (Income)
                  </span>
                  <span className="text-xs font-mono font-black text-[#2E7D32]">
                    {formatCurrency(pnl.revenue?.total || 0)}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-1.5 px-3">Revenue Account</th>
                      <th className="py-1.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(pnl.revenue?.breakdown || {}).length > 0 ? (
                      Object.entries(pnl.revenue?.breakdown || {}).map(([name, amt]) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 font-medium text-slate-700">{name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(amt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                          No revenue recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Total Operating Revenue:</span>
                <span className="font-mono text-[#2E7D32]">{formatCurrency(pnl.revenue?.total || 0)}</span>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 flex justify-between items-center">
                  <span className="font-bold text-rose-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    Operating & Direct Expenses
                  </span>
                  <span className="text-xs font-mono font-black text-rose-700">
                    {formatCurrency(pnl.operatingExpenses?.total || 0)}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-1.5 px-3">Expense Head</th>
                      <th className="py-1.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(pnl.operatingExpenses?.breakdown || {}).length > 0 ? (
                      Object.entries(pnl.operatingExpenses?.breakdown || {}).map(([name, amt]) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 font-medium text-slate-700">{name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(amt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                          No expenses recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Total Operating Expenses:</span>
                <span className="font-mono text-rose-700">{formatCurrency(pnl.operatingExpenses?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Statement Summary Card */}
          <div className="bg-[#0f172a] text-white px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
            <span className="font-bold tracking-wider uppercase text-slate-300">
              Net Financial Result (Revenue - Expenses)
            </span>
            <span
              className={`font-mono font-black text-sm ${
                pnl.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {pnl.netProfit >= 0 ? `+ ${formatCurrency(pnl.netProfit)}` : formatCurrency(pnl.netProfit)}
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: BALANCE SHEET */}
      {!loading && activeTab === 'balance_sheet' && sheet && (
        <div className="space-y-3">
          <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                As of Date:
              </label>
              <input
                type="date"
                value={sheetDate}
                onChange={(e) => setSheetDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-mono font-medium">
              <span>Fundamental Equation:</span>
              <span className="font-bold text-slate-900">Assets = Liabilities + Equity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Assets Column */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-200 flex justify-between items-center">
                  <h3 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    Assets
                  </h3>
                  <span className="text-xs font-mono font-black text-emerald-800">
                    {formatCurrency(sheet.totalAssets)}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-1.5 px-3">Asset Classification</th>
                      <th className="py-1.5 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(sheet.assets?.breakdown || {}).length > 0 ? (
                      Object.entries(sheet.assets?.breakdown || {}).map(([name, amt]) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 font-medium text-slate-700">{name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(amt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                          No asset balances recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3.5 py-2 bg-emerald-100/60 border-t border-emerald-200 flex justify-between items-center text-xs font-bold text-emerald-950">
                <span>TOTAL ASSETS:</span>
                <span className="font-mono text-sm font-black">{formatCurrency(sheet.totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                {/* Liabilities */}
                <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 flex justify-between items-center">
                  <h3 className="font-bold text-rose-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    Liabilities
                  </h3>
                  <span className="text-xs font-mono font-black text-rose-800">
                    {formatCurrency(sheet.liabilities?.total || 0)}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-1.5 px-3">Liability Classification</th>
                      <th className="py-1.5 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(sheet.liabilities?.breakdown || {}).length > 0 ? (
                      Object.entries(sheet.liabilities?.breakdown || {}).map(([name, amt]) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 font-medium text-slate-700">{name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(amt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-2.5 text-center text-slate-400 text-xs">
                          No outstanding liabilities.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Equity */}
                <div className="px-3.5 py-2 bg-indigo-50 border-y border-indigo-200 flex justify-between items-center mt-2">
                  <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wide">
                    Equity & Retained Earnings
                  </h3>
                  <span className="text-xs font-mono font-black text-indigo-800">
                    {formatCurrency(sheet.equity?.total || 0)}
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(sheet.equity?.breakdown || {}).length > 0 ? (
                      Object.entries(sheet.equity?.breakdown || {}).map(([name, amt]) => (
                        <tr key={name} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 font-medium text-slate-700">{name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(amt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-2.5 text-center text-slate-400 text-xs">
                          No equity breakdown available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-3.5 py-2 bg-[#0f172a] text-white flex justify-between items-center text-xs font-bold">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono text-sm font-black text-emerald-400">
                  {formatCurrency(sheet.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CASH & BANK BOOKS */}
      {!loading && activeTab === 'cash_bank' && (
        <div className="space-y-3">
          {/* Dense 3-card metric strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Cash in Hand */}
            <div className="bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash Book</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xl font-mono font-black text-slate-900">
                {formatCurrency(cashBook?.closingBalance || 0)}
              </p>
              <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                <span>Opening: {formatCurrency(cashBook?.openingBalance || 0)}</span>
                <span className="text-emerald-700 font-semibold">Receipts: {formatCurrency(cashBook?.totalReceipts || 0)}</span>
              </div>
            </div>

            {/* Bank Account */}
            <div className="bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bank Ledger</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <p className="text-xl font-mono font-black text-slate-900">
                {formatCurrency(bankLedger?.closingBalance || 0)}
              </p>
              <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                <span>Opening: {formatCurrency(bankLedger?.openingBalance || 0)}</span>
                <span className="text-emerald-700 font-semibold">Receipts: {formatCurrency(bankLedger?.totalReceipts || 0)}</span>
              </div>
            </div>

            {/* UPI Wallet */}
            <div className="bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPI Wallet</span>
                <span className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <p className="text-xl font-mono font-black text-slate-900">
                {formatCurrency(upiLedger?.closingBalance || 0)}
              </p>
              <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                <span>Opening: {formatCurrency(upiLedger?.openingBalance || 0)}</span>
                <span className="text-emerald-700 font-semibold">Receipts: {formatCurrency(upiLedger?.totalReceipts || 0)}</span>
              </div>
            </div>
          </div>

          {/* Cash Book Recent Transactions Table */}
          {cashBook && cashBook.entries && cashBook.entries.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Cash Book Movements
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {cashBook.entries.length} Entries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Voucher No</th>
                      <th className="py-2 px-3">Particulars / Narration</th>
                      <th className="py-2 px-3 text-right">Inflow (Dr)</th>
                      <th className="py-2 px-3 text-right">Outflow (Cr)</th>
                      <th className="py-2 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cashBook.entries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-3 whitespace-nowrap text-slate-600">{formatDate(e.date)}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">{e.entryNumber}</td>
                        <td className="py-1.5 px-3 text-slate-800">{e.narration}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                          {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(e.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DAY BOOK */}
      {!loading && activeTab === 'day_book' && dayBook && (
        <div className="space-y-3">
          <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Select Date:
              </label>
              <input
                type="date"
                value={dayBookDate}
                onChange={(e) => setDayBookDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 text-xs font-bold font-mono">
              <span className="text-slate-600">Total Dr: <span className="text-slate-900">{formatCurrency(dayBook.totalDebit)}</span></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Total Cr: <span className="text-slate-900">{formatCurrency(dayBook.totalCredit)}</span></span>
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 text-[11px]">
                {dayBook.entries?.length || 0} Transactions
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {dayBook.entries && dayBook.entries.length > 0 ? (
              dayBook.entries.map((je: any) => (
                <div
                  key={je.entryNumber || je._id}
                  className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900">{je.entryNumber}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {je.sourceType}
                      </span>
                      {je.isReversed && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          REVERSED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{formatDate(je.date)}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium px-1">{je.narration}</p>

                  <div className="bg-slate-50 rounded border border-slate-200/80 px-2 py-1 divide-y divide-slate-200/60">
                    {je.lines.map((l: any, lineIdx: number) => (
                      <div key={lineIdx} className="py-1 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-700 mr-2 text-[11px]">{l.accountCode}</span>
                          <span className="font-medium text-slate-900">{l.accountName}</span>
                          {l.partyName && (
                            <span className="text-[10px] text-slate-500 ml-1.5">({l.partyName})</span>
                          )}
                        </div>
                        <div className="flex gap-4 font-mono text-right text-xs">
                          <span className={l.debit > 0 ? 'text-slate-900 font-bold' : 'text-slate-300'}>
                            {l.debit > 0 ? `Dr: ${formatCurrency(l.debit)}` : '-'}
                          </span>
                          <span className={l.credit > 0 ? 'text-slate-900 font-bold' : 'text-slate-300'}>
                            {l.credit > 0 ? `Cr: ${formatCurrency(l.credit)}` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-lg border border-slate-200 text-slate-400 text-xs font-medium">
                No journal transactions recorded for {formatDate(dayBookDate)}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: AGEING ANALYSIS */}
      {!loading && activeTab === 'ageing' && (
        <div className="space-y-3">
          {/* Sub-toggle: Receivables vs Payables */}
          <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                onClick={() => setAgeingType('RECEIVABLES')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  ageingType === 'RECEIVABLES'
                    ? 'bg-[#2E7D32] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Customer Receivables Ageing
              </button>
              <button
                onClick={() => setAgeingType('PAYABLES')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  ageingType === 'PAYABLES'
                    ? 'bg-[#2E7D32] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Supplier Payables Ageing
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search party or mobile..."
                value={ageingSearch}
                onChange={(e) => setAgeingSearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-medium w-56 focus:outline-none focus:border-[#2E7D32]"
              />
            </div>
          </div>

          {/* Ageing KPI Summary Cards */}
          {ageingType === 'RECEIVABLES' && receivableAgeing && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
                  <p className="text-base font-mono font-black text-slate-900 mt-0.5">{formatCurrency(receivableAgeing.totalOutstanding)}</p>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Current (&lt; 30 Days)</span>
                  <p className="text-base font-mono font-black text-emerald-800 mt-0.5">
                    {formatCurrency((receivableAgeing.summary?.current || 0) + (receivableAgeing.summary?.days_1_30 || 0))}
                  </p>
                </div>
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">31 - 60 Days</span>
                  <p className="text-base font-mono font-black text-amber-800 mt-0.5">{formatCurrency(receivableAgeing.summary?.days_31_60 || 0)}</p>
                </div>
                <div className="bg-orange-50/70 p-2.5 rounded-lg border border-orange-200 shadow-xs">
                  <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">61 - 90 Days</span>
                  <p className="text-base font-mono font-black text-orange-800 mt-0.5">{formatCurrency(receivableAgeing.summary?.days_61_90 || 0)}</p>
                </div>
                <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 shadow-xs">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">&gt; 90 Days (Critical)</span>
                  <p className="text-base font-mono font-black text-rose-800 mt-0.5">{formatCurrency(receivableAgeing.summary?.days_90_plus || 0)}</p>
                </div>
              </div>

              {/* Receivables Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      <th className="py-2 px-3">Customer Name</th>
                      <th className="py-2 px-3">Mobile</th>
                      <th className="py-2 px-3">Age</th>
                      <th className="py-2 px-3">Bracket</th>
                      <th className="py-2 px-3 text-right">Outstanding Amount</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReceivableCustomers.length > 0 ? (
                      filteredReceivableCustomers.map((c) => (
                        <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">{c.mobile}</td>
                          <td className="py-1.5 px-3 text-slate-700">{c.ageDays} days</td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                c.bucket === 'CURRENT' || c.bucket === '1_30'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.bucket === '31_60'
                                  ? 'bg-amber-100 text-amber-800'
                                  : c.bucket === '61_90'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {c.bucket === 'CURRENT'
                                ? '< 1 Day'
                                : c.bucket === '1_30'
                                ? '1 - 30 Days'
                                : c.bucket === '31_60'
                                ? '31 - 60 Days'
                                : c.bucket === '61_90'
                                ? '61 - 90 Days'
                                : '> 90 Days'}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrency(c.outstanding)}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <Link
                              to={`/accounts?search=${encodeURIComponent(c.mobile || c.name)}`}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors inline-block border border-slate-200"
                            >
                              View Account
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No customer receivables found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Payables Ageing */}
          {ageingType === 'PAYABLES' && payableAgeing && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payables</span>
                  <p className="text-base font-mono font-black text-slate-900 mt-0.5">{formatCurrency(payableAgeing.totalPayable)}</p>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Current (&lt; 30 Days)</span>
                  <p className="text-base font-mono font-black text-emerald-800 mt-0.5">
                    {formatCurrency((payableAgeing.summary?.current || 0) + (payableAgeing.summary?.days_1_30 || 0))}
                  </p>
                </div>
                <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">31 - 60 Days</span>
                  <p className="text-base font-mono font-black text-amber-800 mt-0.5">{formatCurrency(payableAgeing.summary?.days_31_60 || 0)}</p>
                </div>
                <div className="bg-orange-50/70 p-2.5 rounded-lg border border-orange-200 shadow-xs">
                  <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">61 - 90 Days</span>
                  <p className="text-base font-mono font-black text-orange-800 mt-0.5">{formatCurrency(payableAgeing.summary?.days_61_90 || 0)}</p>
                </div>
                <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 shadow-xs">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">&gt; 90 Days (Overdue)</span>
                  <p className="text-base font-mono font-black text-rose-800 mt-0.5">{formatCurrency(payableAgeing.summary?.days_90_plus || 0)}</p>
                </div>
              </div>

              {/* Payables Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      <th className="py-2 px-3">Supplier Name</th>
                      <th className="py-2 px-3">Mobile</th>
                      <th className="py-2 px-3">Age</th>
                      <th className="py-2 px-3">Bracket</th>
                      <th className="py-2 px-3 text-right">Payable Amount</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPayableSuppliers.length > 0 ? (
                      filteredPayableSuppliers.map((s) => (
                        <tr key={s.supplierId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 px-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">{s.mobile}</td>
                          <td className="py-1.5 px-3 text-slate-700">{s.ageDays} days</td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.bucket === 'CURRENT' || s.bucket === '1_30'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.bucket === '31_60'
                                  ? 'bg-amber-100 text-amber-800'
                                  : s.bucket === '61_90'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {s.bucket === 'CURRENT'
                                ? '< 1 Day'
                                : s.bucket === '1_30'
                                ? '1 - 30 Days'
                                : s.bucket === '31_60'
                                ? '31 - 60 Days'
                                : s.bucket === '61_90'
                                ? '61 - 90 Days'
                                : '> 90 Days'}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrency(s.payable)}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <Link
                              to={`/suppliers/${s.supplierId}`}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors inline-block border border-slate-200"
                            >
                              View Supplier
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No supplier payables found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* INTERNAL TRANSFER MODAL */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#6B1724]/10 text-[#6B1724] flex items-center justify-center">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Record Internal Transfer</h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">From Account</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK">Bank Account</option>
                    <option value="UPI">UPI Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">To Account</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-semibold"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="UPI">UPI Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposit to bank branch"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-mono">
                Automated Journal Posting:
                <br />
                <span className="text-[#2E7D32] font-bold">Debit: {transferTo}</span> &bull;{' '}
                <span className="text-slate-900 font-bold">Credit: {transferFrom}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="w-1/2 py-2 rounded border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="w-1/2 py-2 rounded bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submittingTransfer ? 'Recording...' : 'Post Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
