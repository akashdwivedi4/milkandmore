import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrialBalanceData,
  ProfitAndLossData,
  BalanceSheetData,
  CashBookData,
  BankUpiLedgerData,
  DayBookData,
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
} from 'lucide-react';

export const Financials: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'ledger' | 'trial_balance' | 'pnl' | 'balance_sheet' | 'cash_bank' | 'day_book'
  >('ledger');
  const [loading, setLoading] = useState(false);

  // General Ledger state
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('1010');
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Date helpers
  const getLocalToday = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  const getLocalMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

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

  // Internal Transfer Modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<'CASH' | 'BANK' | 'UPI'>('CASH');
  const [transferTo, setTransferTo] = useState<'CASH' | 'BANK' | 'UPI'>('BANK');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Load Chart of Accounts once
  useEffect(() => {
    api.getChartOfAccounts().then((res) => {
      if (res.success && res.data) {
        setChartOfAccounts(res.data);
      }
    }).catch(console.error);
  }, []);

  // Fetch data depending on active tab
  const fetchTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'ledger') {
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

  return (
    <div className="space-y-6">
      {/* Header with Title and Transfer CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Milk & More Accounting Standard
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Balanced Ledger
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5 flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-indigo-400" />
            Financials & Books of Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-0.5">
            Real-time General Ledger, Trial Balance, Profit & Loss, Balance Sheet, Cash & Bank Books, and Day Book.
          </p>
        </div>

        <button
          onClick={() => setTransferModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Internal Transfer</span>
        </button>
      </div>

      {/* Financial Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          General Ledger
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'trial_balance'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
        </button>

        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'pnl'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss
        </button>

        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'balance_sheet'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Balance Sheet
        </button>

        <button
          onClick={() => setActiveTab('cash_bank')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'cash_bank'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Cash & Bank Books
        </button>

        <button
          onClick={() => setActiveTab('day_book')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'day_book'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Day Book
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold">Computing verified accounting ledger...</span>
        </div>
      )}

      {/* TAB 1: GENERAL LEDGER */}
      {!loading && activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Account:</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {chartOfAccounts.map((acc: any) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} — {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            {ledgerData && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-500">
                  Total Debits: <strong className="text-slate-900">{formatCurrency(ledgerData.totalDebit || 0)}</strong>
                </span>
                <span className="text-slate-500">
                  Total Credits: <strong className="text-slate-900">{formatCurrency(ledgerData.totalCredit || 0)}</strong>
                </span>
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl font-black">
                  Closing Balance: {formatCurrency(ledgerData.closingBalance || 0)}
                </span>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Particulars & Narration</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Debit (Dr)</th>
                    <th className="py-3 px-4 text-right">Credit (Cr)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledgerData && ledgerData.entries && ledgerData.entries.length > 0 ? (
                    ledgerData.entries.map((e: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatDate(e.date)}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{e.entryNumber}</td>
                        <td className="py-3 px-4 text-slate-800 max-w-xs truncate" title={e.narration}>
                          {e.narration}
                          {e.partyName && (
                            <span className="block text-[10px] text-slate-400 font-normal">Party: {e.partyName}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {e.sourceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-indigo-700">
                          {formatCurrency(e.runningBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">As of Date:</label>
              <input
                type="date"
                value={trialBalanceDate}
                onChange={(e) => setTrialBalanceDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-3">
              {trialBalance.isBalanced ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Books In Balance: Total Debits == Total Credits</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Mismatch detected! Difference: {formatCurrency(trialBalance.difference)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Debit (Dr)</th>
                  <th className="py-3 px-4 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {trialBalance.accounts.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{row.name}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
                  <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">
                    Grand Total
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {formatCurrency(trialBalance.grandTotalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>From:</span>
              <input
                type="date"
                value={pnlStartDate}
                onChange={(e) => setPnlStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg"
              />
              <span>To:</span>
              <input
                type="date"
                value={pnlEndDate}
                onChange={(e) => setPnlEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div
              className={`px-4 py-2 rounded-2xl border font-black text-sm ${
                pnl.netProfit >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              Net Profit: {formatCurrency(pnl.netProfit)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-sm">Operating Revenue</span>
                <span className="text-base font-black text-emerald-600">
                  {formatCurrency(pnl.revenue.total)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(pnl.revenue.breakdown || {}).map(([name, amt]) => (
                  <div key={name} className="flex justify-between text-slate-600">
                    <span>{name}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-sm">Operating Expenses</span>
                <span className="text-base font-black text-rose-600">
                  {formatCurrency(pnl.operatingExpenses.total)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(pnl.operatingExpenses.breakdown || {}).map(([name, amt]) => (
                  <div key={name} className="flex justify-between text-slate-600">
                    <span>{name}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BALANCE SHEET */}
      {!loading && activeTab === 'balance_sheet' && sheet && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">As of Date:</label>
              <input
                type="date"
                value={sheetDate}
                onChange={(e) => setSheetDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold">
              <span>Fundamental Equation: Assets == Liabilities + Equity</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assets */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  TOTAL ASSETS
                </h3>
                <span className="text-base font-black text-emerald-600">
                  {formatCurrency(sheet.totalAssets)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(sheet.assets?.breakdown || {}).map(([name, amt]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                    <span>{name}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                    LIABILITIES
                  </h3>
                  <span className="text-sm font-bold text-rose-600">
                    {formatCurrency(sheet.liabilities?.total || 0)}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(sheet.liabilities?.breakdown || {}).map(([name, amt]) => (
                    <div key={name} className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                      <span>{name}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">EQUITY & EARNINGS</h3>
                  <span className="text-sm font-bold text-indigo-600">
                    {formatCurrency(sheet.equity?.total || 0)}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(sheet.equity?.breakdown || {}).map(([name, amt]) => (
                    <div key={name} className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                      <span>{name}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center font-black text-xs">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="text-emerald-400">{formatCurrency(sheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CASH & BANK BOOKS */}
      {!loading && activeTab === 'cash_bank' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cash in Hand */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Book</span>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(cashBook?.closingBalance || 0)}
              </p>
              <div className="text-[11px] text-slate-400 flex justify-between pt-2 border-t border-slate-100">
                <span>Opening: {formatCurrency(cashBook?.openingBalance || 0)}</span>
                <span>Receipts: {formatCurrency(cashBook?.totalReceipts || 0)}</span>
              </div>
            </div>

            {/* Bank Account */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Ledger</span>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(bankLedger?.closingBalance || 0)}
              </p>
              <div className="text-[11px] text-slate-400 flex justify-between pt-2 border-t border-slate-100">
                <span>Opening: {formatCurrency(bankLedger?.openingBalance || 0)}</span>
                <span>Receipts: {formatCurrency(bankLedger?.totalReceipts || 0)}</span>
              </div>
            </div>

            {/* UPI Wallet */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI Wallet</span>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(upiLedger?.closingBalance || 0)}
              </p>
              <div className="text-[11px] text-slate-400 flex justify-between pt-2 border-t border-slate-100">
                <span>Opening: {formatCurrency(upiLedger?.openingBalance || 0)}</span>
                <span>Receipts: {formatCurrency(upiLedger?.totalReceipts || 0)}</span>
              </div>
            </div>
          </div>

          {/* Cash Book Recent Transactions */}
          {cashBook && cashBook.entries && cashBook.entries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Cash Book Movements
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Voucher No</th>
                      <th className="py-2.5 px-4">Particulars</th>
                      <th className="py-2.5 px-4 text-right">Inflow (Dr)</th>
                      <th className="py-2.5 px-4 text-right">Outflow (Cr)</th>
                      <th className="py-2.5 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cashBook.entries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4">{formatDate(e.date)}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{e.entryNumber}</td>
                        <td className="py-2.5 px-4 text-slate-800">{e.narration}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 font-bold">
                          {e.debit > 0 ? formatCurrency(e.debit) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-rose-600 font-bold">
                          {e.credit > 0 ? formatCurrency(e.credit) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900">
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Select Date:</label>
              <input
                type="date"
                value={dayBookDate}
                onChange={(e) => setDayBookDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-600">Total Dr: {formatCurrency(dayBook.totalDebit)}</span>
              <span className="text-slate-600">Total Cr: {formatCurrency(dayBook.totalCredit)}</span>
              <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-800">
                {dayBook.entries?.length || 0} Transactions
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {dayBook.entries && dayBook.entries.length > 0 ? (
              dayBook.entries.map((je: any) => (
                <div
                  key={je.entryNumber || je._id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900">{je.entryNumber}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {je.sourceType}
                      </span>
                      {je.isReversed && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          REVERSED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{formatDate(je.date)}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{je.narration}</p>

                  <div className="bg-slate-50 rounded-xl p-2.5 divide-y divide-slate-200/60">
                    {je.lines.map((l: any, lineIdx: number) => (
                      <div key={lineIdx} className="py-1.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-slate-700 mr-2">{l.accountCode}</span>
                          <span className="font-semibold text-slate-900">{l.accountName}</span>
                          {l.partyName && (
                            <span className="text-[10px] text-slate-400 ml-2">({l.partyName})</span>
                          )}
                        </div>
                        <div className="flex gap-6 font-mono font-bold text-right">
                          <span className={l.debit > 0 ? 'text-slate-900' : 'text-slate-300'}>
                            {l.debit > 0 ? `Dr: ${formatCurrency(l.debit)}` : '-'}
                          </span>
                          <span className={l.credit > 0 ? 'text-slate-900' : 'text-slate-300'}>
                            {l.credit > 0 ? `Cr: ${formatCurrency(l.credit)}` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm font-medium">
                No journal transactions recorded for {formatDate(dayBookDate)}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERNAL TRANSFER MODAL */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Record Internal Transfer</h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">From Account</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK">Bank Account</option>
                    <option value="UPI">UPI Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">To Account</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="UPI">UPI Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposit to bank branch"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                This transaction automatically creates a balanced journal entry:
                <br />
                <strong>Debit:</strong> {transferTo} &bull; <strong>Credit:</strong> {transferFrom}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50"
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
