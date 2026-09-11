import { Types, ClientSession } from 'mongoose';
import { JournalEntry, IJournalEntry, IJournalLine, JournalSourceType } from '../models/JournalEntry';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Product } from '../models/Product';
import { Delivery } from '../models/Delivery';
import { CustomerPayment } from '../models/CustomerPayment';
import { Purchase } from '../models/Purchase';
import { SupplierPayment } from '../models/SupplierPayment';
import { FinancialAccount } from '../models/FinancialAccount';
import { updateAccountBalance } from './accountService';
import { logAudit } from './auditService';
import { runInTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { roundMoney, safeAdd, safeSubtract } from '../utils/math';
import { getTodayDateString } from '../utils/date';

// -----------------------------------------------------------------------------
// STANDARD CHART OF ACCOUNTS FOR INDIAN DAIRY BUSINESS
// -----------------------------------------------------------------------------
export const CHART_OF_ACCOUNTS = {
  // ASSETS (1000 - 1999)
  CASH: { code: '1010', name: 'Cash in Hand', type: 'ASSET' as const },
  BANK: { code: '1020', name: 'Bank Account', type: 'ASSET' as const },
  UPI: { code: '1030', name: 'UPI Wallet', type: 'ASSET' as const },
  CUSTOMER_RECEIVABLES: { code: '1100', name: 'Customer Receivables', type: 'ASSET' as const },
  INVENTORY: { code: '1200', name: 'Finished Goods Inventory', type: 'ASSET' as const },
  FIXED_ASSETS: { code: '1500', name: 'Dairy Equipment & Fixed Assets', type: 'ASSET' as const },

  // LIABILITIES (2000 - 2999)
  SUPPLIER_PAYABLES: { code: '2100', name: 'Supplier Payables', type: 'LIABILITY' as const },
  LOANS: { code: '2200', name: 'Loans & Borrowings', type: 'LIABILITY' as const },
  OTHER_LIABILITIES: { code: '2300', name: 'Other Current Liabilities', type: 'LIABILITY' as const },

  // EQUITY (3000 - 3999)
  OWNER_CAPITAL: { code: '3010', name: 'Owner Capital', type: 'EQUITY' as const },
  OPENING_EQUITY: { code: '3020', name: 'Opening Balance Equity', type: 'EQUITY' as const },
  RETAINED_EARNINGS: { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const },
  CURRENT_YEAR_EARNINGS: { code: '3200', name: 'Current Period Net Profit/Loss', type: 'EQUITY' as const },

  // INCOME (4000 - 4999)
  MILK_SALES: { code: '4010', name: 'Milk Sales', type: 'INCOME' as const },
  DAIRY_PRODUCTS_SALES: { code: '4020', name: 'Dairy Products Sales', type: 'INCOME' as const },
  OTHER_SALES: { code: '4030', name: 'Other Sales', type: 'INCOME' as const },
  OTHER_INCOME: { code: '4100', name: 'Other Operating Income', type: 'INCOME' as const },

  // COST OF GOODS SOLD (5000 - 5999)
  MILK_COGS: { code: '5010', name: 'Cost of Goods Sold - Milk', type: 'EXPENSE' as const },
  DAIRY_PRODUCTS_COGS: { code: '5020', name: 'Cost of Goods Sold - Products', type: 'EXPENSE' as const },
  OTHER_COGS: { code: '5030', name: 'Direct Production Costs', type: 'EXPENSE' as const },

  // EXPENSES (6000 - 6999)
  EXPENSE_SALARY: { code: '6010', name: 'Staff Salary & Wages', type: 'EXPENSE' as const },
  EXPENSE_RENT: { code: '6020', name: 'Rent & Facility Expense', type: 'EXPENSE' as const },
  EXPENSE_ELECTRICITY: { code: '6030', name: 'Electricity & Utilities', type: 'EXPENSE' as const },
  EXPENSE_TRANSPORT: { code: '6040', name: 'Transport & Freight', type: 'EXPENSE' as const },
  EXPENSE_FUEL: { code: '6050', name: 'Vehicle Fuel Expense', type: 'EXPENSE' as const },
  EXPENSE_PACKAGING: { code: '6060', name: 'Bottles & Packaging Materials', type: 'EXPENSE' as const },
  EXPENSE_MAINTENANCE: { code: '6070', name: 'Equipment Maintenance', type: 'EXPENSE' as const },
  EXPENSE_MARKETING: { code: '6080', name: 'Marketing & Promotional', type: 'EXPENSE' as const },
  EXPENSE_MISCELLANEOUS: { code: '6090', name: 'General & Miscellaneous Expense', type: 'EXPENSE' as const },
};

export const getPaymentAccountByMode = (mode: string) => {
  const m = (mode || 'CASH').toUpperCase();
  if (m === 'BANK' || m === '1020') return CHART_OF_ACCOUNTS.BANK;
  if (m === 'UPI' || m === '1030') return CHART_OF_ACCOUNTS.UPI;
  return CHART_OF_ACCOUNTS.CASH;
};

export const getExpenseAccountByCategory = (category: string) => {
  const cat = (category || 'OTHER').toUpperCase();
  if (cat.includes('SALARY') || cat.includes('WAGE')) return CHART_OF_ACCOUNTS.EXPENSE_SALARY;
  if (cat.includes('RENT')) return CHART_OF_ACCOUNTS.EXPENSE_RENT;
  if (cat.includes('ELECTRIC') || cat.includes('POWER') || cat.includes('UTILITY')) return CHART_OF_ACCOUNTS.EXPENSE_ELECTRICITY;
  if (cat.includes('TRANSPORT') || cat.includes('FREIGHT')) return CHART_OF_ACCOUNTS.EXPENSE_TRANSPORT;
  if (cat.includes('FUEL') || cat.includes('DIESEL') || cat.includes('PETROL')) return CHART_OF_ACCOUNTS.EXPENSE_FUEL;
  if (cat.includes('PACKAGING') || cat.includes('BOTTLE')) return CHART_OF_ACCOUNTS.EXPENSE_PACKAGING;
  if (cat.includes('MAINTENANCE') || cat.includes('REPAIR')) return CHART_OF_ACCOUNTS.EXPENSE_MAINTENANCE;
  if (cat.includes('MARKETING') || cat.includes('AD')) return CHART_OF_ACCOUNTS.EXPENSE_MARKETING;
  return CHART_OF_ACCOUNTS.EXPENSE_MISCELLANEOUS;
};

// -----------------------------------------------------------------------------
// POST JOURNAL ENTRY (DOUBLE-ENTRY ATOMIC VALIDATION)
// -----------------------------------------------------------------------------
export interface PostJournalParams {
  businessId: string | Types.ObjectId;
  date?: string;
  entryDate?: string;
  sourceType?: JournalSourceType;
  entryType?: JournalSourceType;
  referenceType?: string;
  sourceId?: string | Types.ObjectId;
  referenceId?: string | Types.ObjectId;
  narration: string;
  lines: IJournalLine[];
  userId?: string | Types.ObjectId;
}

export const postJournalEntry = async (
  params: PostJournalParams,
  session?: ClientSession | null
): Promise<IJournalEntry> => {
  const bizId = new Types.ObjectId(params.businessId);
  const date = params.date || params.entryDate || getTodayDateString();
  const sourceType = (params.sourceType || params.entryType || params.referenceType || 'ADJUSTMENT') as JournalSourceType;
  const sourceId = params.sourceId || params.referenceId;
  const sourceIdStr = sourceId ? sourceId.toString() : undefined;

  // Validate balanced debit and credit
  let sumDebit = 0;
  let sumCredit = 0;
  const processedLines: IJournalLine[] = [];

  for (const line of params.lines) {
    const d = roundMoney(Number(line.debit) || 0);
    const c = roundMoney(Number(line.credit) || 0);
    if (d < 0 || c < 0) {
      throw new AppError('Journal lines cannot contain negative debit or credit amounts.', 400);
    }
    if (d > 0 && c > 0) {
      throw new AppError('A single journal line cannot contain both debit and credit.', 400);
    }
    if (d === 0 && c === 0) {
      continue; // skip zero lines
    }

    sumDebit += d;
    sumCredit += c;

    processedLines.push({
      accountCode: line.accountCode,
      accountName: line.accountName,
      accountType: line.accountType,
      debit: d,
      credit: c,
      partyType: line.partyType || 'NONE',
      partyId: line.partyId,
      partyName: line.partyName,
    });
  }

  sumDebit = roundMoney(sumDebit);
  sumCredit = roundMoney(sumCredit);

  if (processedLines.length < 2) {
    throw new AppError('A journal entry must contain at least 2 non-zero lines.', 400);
  }

  if (Math.abs(safeSubtract(sumDebit, sumCredit)) > 0.001) {
    throw new AppError(
      `Unbalanced journal entry! Total Debit (₹${sumDebit}) does not equal Total Credit (₹${sumCredit}).`,
      400
    );
  }

  // Generate unique entry number
  const count = await JournalEntry.countDocuments({ businessId: bizId }).session(session || null);
  const entryNumber = `JE-${date.replace(/-/g, '')}-${(count + 1).toString().padStart(5, '0')}`;

  const entryDocs = await JournalEntry.create(
    [
      {
        businessId: bizId,
        entryNumber,
        date,
        sourceType,
        sourceId: sourceIdStr,
        narration: params.narration,
        lines: processedLines,
        totalDebit: sumDebit,
        totalCredit: sumCredit,
        createdBy: params.userId ? new Types.ObjectId(params.userId) : undefined,
        isReversed: false,
      },
    ],
    { session: session || undefined }
  );

  return entryDocs[0];
};

// -----------------------------------------------------------------------------
// REVERSE JOURNAL ENTRY (AUDIT-COMPLIANT REVERSAL)
// -----------------------------------------------------------------------------
export const reverseJournalEntry = async (
  businessId: string | Types.ObjectId,
  entryIdOrSourceType: string | Types.ObjectId,
  reasonOrSourceId: string | Types.ObjectId,
  userIdOrReason?: string | Types.ObjectId,
  sessionOrUserId?: any,
  maybeSession?: ClientSession | null
): Promise<IJournalEntry | null> => {
  const bizId = new Types.ObjectId(businessId);
  let original: IJournalEntry | null = null;
  let reason = '';
  let userId: string | Types.ObjectId | undefined = undefined;
  let session: ClientSession | null = null;

  // Check if first param is directly a JournalEntry by _id
  if (Types.ObjectId.isValid(entryIdOrSourceType.toString())) {
    const candidateSession = (typeof sessionOrUserId === 'object' && sessionOrUserId && 'id' in sessionOrUserId ? sessionOrUserId : maybeSession) || null;
    original = await JournalEntry.findOne({
      _id: new Types.ObjectId(entryIdOrSourceType),
      businessId: bizId,
    }).session(candidateSession || null);
  }

  if (!original) {
    // Treated as (businessId, sourceType, sourceId, reason, session)
    const sourceType = entryIdOrSourceType.toString() as JournalSourceType;
    const sourceId = reasonOrSourceId ? reasonOrSourceId.toString() : '';
    reason = (userIdOrReason ? userIdOrReason.toString() : '') || 'Reversal';
    session = (typeof sessionOrUserId === 'object' && sessionOrUserId) ? sessionOrUserId : (maybeSession || null);

    original = await JournalEntry.findOne({
      businessId: bizId,
      sourceType,
      sourceId,
      isReversed: false,
    }).session(session || null);
  } else {
    reason = (reasonOrSourceId ? reasonOrSourceId.toString() : '') || 'Reversal';
    userId = userIdOrReason as any;
    session = (typeof sessionOrUserId === 'object' && sessionOrUserId) ? sessionOrUserId : (maybeSession || null);
  }

  if (!original) {
    return null;
  }

  if (original.isReversed) {
    return original;
  }

  // Swap debits and credits
  const reversalLines: IJournalLine[] = original.lines.map((l) => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    accountType: l.accountType,
    debit: l.credit,
    credit: l.debit,
    partyType: l.partyType,
    partyId: l.partyId,
    partyName: l.partyName,
  }));

  const reversal = await postJournalEntry(
    {
      businessId: bizId,
      date: getTodayDateString(),
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      narration: `[REVERSAL of ${original.entryNumber}] ${reason}`,
      lines: reversalLines,
      userId,
    },
    session
  );

  original.isReversed = true;
  original.reversedByEntryId = reversal._id;
  await original.save({ session: session || undefined });

  reversal.reversalOfEntryId = original._id;
  await reversal.save({ session: session || undefined });

  return reversal;
};

// -----------------------------------------------------------------------------
// GENERAL LEDGER
// -----------------------------------------------------------------------------
export interface GeneralLedgerFilter {
  accountCode?: string;
  startDate?: string;
  endDate?: string;
  partyId?: string;
}

export const getGeneralLedger = async (
  businessId: string | Types.ObjectId,
  filters: GeneralLedgerFilter = {}
) => {
  const bizId = new Types.ObjectId(businessId);
  const query: any = { businessId: bizId, isReversed: false };

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = filters.startDate;
    if (filters.endDate) query.date.$lte = filters.endDate;
  }

  if (filters.accountCode) {
    query['lines.accountCode'] = filters.accountCode;
  }

  if (filters.partyId) {
    query['lines.partyId'] = new Types.ObjectId(filters.partyId);
  }

  const entries = await JournalEntry.find(query).sort({ date: 1, createdAt: 1 });

  // Map to ledger rows
  let runningBalance = 0;
  const rows: any[] = [];

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (filters.accountCode && line.accountCode !== filters.accountCode) {
        continue;
      }
      if (filters.partyId && line.partyId?.toString() !== filters.partyId) {
        continue;
      }

      // Calculate running balance based on account nature
      // Asset / Expense: Debit increases balance, Credit decreases
      // Liability / Equity / Income: Credit increases balance, Debit decreases
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(line.accountType);
      if (isDebitNormal) {
        runningBalance = roundMoney(runningBalance + line.debit - line.credit);
      } else {
        runningBalance = roundMoney(runningBalance + line.credit - line.debit);
      }

      rows.push({
        id: entry._id.toString(),
        entryNumber: entry.entryNumber,
        date: entry.date,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        narration: entry.narration,
        accountCode: line.accountCode,
        accountName: line.accountName,
        accountType: line.accountType,
        partyName: line.partyName,
        debit: line.debit,
        credit: line.credit,
        runningBalance,
      });
    }
  }

  return {
    accountCode: filters.accountCode || 'ALL',
    totalEntries: rows.length,
    closingBalance: runningBalance,
    entries: rows,
  };
};

// -----------------------------------------------------------------------------
// TRIAL BALANCE (TOTAL DEBIT MUST EQUAL TOTAL CREDIT)
// -----------------------------------------------------------------------------
export const getTrialBalance = async (
  businessId: string | Types.ObjectId,
  asOfDate?: string
) => {
  const bizId = new Types.ObjectId(businessId);
  const targetDate = asOfDate || getTodayDateString();

  const entries = await JournalEntry.find({
    businessId: bizId,
    date: { $lte: targetDate },
    isReversed: false,
  });

  const accountMap = new Map<
    string,
    { code: string; name: string; type: string; totalDebit: number; totalCredit: number }
  >();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const existing = accountMap.get(line.accountCode) || {
        code: line.accountCode,
        name: line.accountName,
        type: line.accountType,
        totalDebit: 0,
        totalCredit: 0,
      };

      existing.totalDebit = roundMoney(existing.totalDebit + line.debit);
      existing.totalCredit = roundMoney(existing.totalCredit + line.credit);
      accountMap.set(line.accountCode, existing);
    }
  }

  const rows = [];
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  for (const acc of accountMap.values()) {
    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(acc.type);
    let netDebit = 0;
    let netCredit = 0;

    if (isDebitNormal) {
      const net = roundMoney(acc.totalDebit - acc.totalCredit);
      if (net >= 0) {
        netDebit = net;
      } else {
        netCredit = Math.abs(net);
      }
    } else {
      const net = roundMoney(acc.totalCredit - acc.totalDebit);
      if (net >= 0) {
        netCredit = net;
      } else {
        netDebit = Math.abs(net);
      }
    }

    grandTotalDebit = roundMoney(grandTotalDebit + netDebit);
    grandTotalCredit = roundMoney(grandTotalCredit + netCredit);

    rows.push({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit: acc.totalDebit,
      totalCredit: acc.totalCredit,
      netDebit,
      netCredit,
    });
  }

  // Sort by account code
  rows.sort((a, b) => a.code.localeCompare(b.code));

  const isBalanced = Math.abs(safeSubtract(grandTotalDebit, grandTotalCredit)) < 0.01;

  return {
    asOfDate: targetDate,
    isBalanced,
    grandTotalDebit,
    grandTotalCredit,
    totalDebit: grandTotalDebit,
    totalCredit: grandTotalCredit,
    difference: roundMoney(Math.abs(grandTotalDebit - grandTotalCredit)),
    accounts: rows,
  };
};

// -----------------------------------------------------------------------------
// PROFIT & LOSS (DERIVED FROM POSTED ACCOUNTING DATA)
// -----------------------------------------------------------------------------
export const getProfitAndLossStatement = async (
  businessId: string | Types.ObjectId,
  startDate?: string,
  endDate?: string
) => {
  const bizId = new Types.ObjectId(businessId);
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const end = endDate || getTodayDateString();

  const entries = await JournalEntry.find({
    businessId: bizId,
    date: { $gte: start, $lte: end },
    isReversed: false,
  });

  let totalRevenue = 0;
  const revenueAccounts: Record<string, number> = {};

  let totalCOGS = 0;
  const cogsAccounts: Record<string, number> = {};

  let totalOperatingExpenses = 0;
  const expenseAccounts: Record<string, number> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const code = line.accountCode;
      const amount = roundMoney(line.credit - line.debit); // net credit for income

      // Income (4000 - 4999)
      if (code.startsWith('4')) {
        const net = roundMoney(line.credit - line.debit);
        revenueAccounts[line.accountName] = roundMoney((revenueAccounts[line.accountName] || 0) + net);
        totalRevenue = roundMoney(totalRevenue + net);
      }
      // COGS (5000 - 5999)
      else if (code.startsWith('5')) {
        const net = roundMoney(line.debit - line.credit);
        cogsAccounts[line.accountName] = roundMoney((cogsAccounts[line.accountName] || 0) + net);
        totalCOGS = roundMoney(totalCOGS + net);
      }
      // Operating Expenses (6000 - 6999)
      else if (code.startsWith('6')) {
        const net = roundMoney(line.debit - line.credit);
        expenseAccounts[line.accountName] = roundMoney((expenseAccounts[line.accountName] || 0) + net);
        totalOperatingExpenses = roundMoney(totalOperatingExpenses + net);
      }
    }
  }

  const grossProfit = roundMoney(totalRevenue - totalCOGS);
  const netProfit = roundMoney(grossProfit - totalOperatingExpenses);

  return {
    period: { startDate: start, endDate: end },
    revenue: {
      total: totalRevenue,
      breakdown: revenueAccounts,
    },
    cogs: {
      total: totalCOGS,
      breakdown: cogsAccounts,
    },
    grossProfit,
    operatingExpenses: {
      total: totalOperatingExpenses,
      breakdown: expenseAccounts,
    },
    netProfit,
  };
};

// -----------------------------------------------------------------------------
// BALANCE SHEET (ASSETS = LIABILITIES + EQUITY)
// -----------------------------------------------------------------------------
export const getBalanceSheetStatement = async (
  businessId: string | Types.ObjectId,
  asOfDate?: string
) => {
  const bizId = new Types.ObjectId(businessId);
  const targetDate = asOfDate || getTodayDateString();

  const tb = await getTrialBalance(bizId, targetDate);
  const pnl = await getProfitAndLossStatement(bizId, undefined, targetDate);

  const assets: any[] = [];
  const liabilities: any[] = [];
  const equity: any[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const acc of tb.accounts) {
    if (acc.type === 'ASSET') {
      const val = roundMoney(acc.netDebit - acc.netCredit);
      totalAssets = roundMoney(totalAssets + val);
      assets.push({ code: acc.code, name: acc.name, amount: val });
    } else if (acc.type === 'LIABILITY') {
      const val = roundMoney(acc.netCredit - acc.netDebit);
      totalLiabilities = roundMoney(totalLiabilities + val);
      liabilities.push({ code: acc.code, name: acc.name, amount: val });
    } else if (acc.type === 'EQUITY') {
      const val = roundMoney(acc.netCredit - acc.netDebit);
      totalEquity = roundMoney(totalEquity + val);
      equity.push({ code: acc.code, name: acc.name, amount: val });
    }
  }

  // Add current period net profit to equity
  totalEquity = roundMoney(totalEquity + pnl.netProfit);
  equity.push({
    code: '3200',
    name: 'Current Period Earnings (Net Profit/Loss)',
    amount: pnl.netProfit,
  });

  const totalLiabilitiesAndEquity = roundMoney(totalLiabilities + totalEquity);
  const isBalanced = Math.abs(safeSubtract(totalAssets, totalLiabilitiesAndEquity)) < 0.05;

  return {
    asOfDate: targetDate,
    isBalanced,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    difference: roundMoney(Math.abs(totalAssets - totalLiabilitiesAndEquity)),
    assets,
    liabilities,
    equity,
  };
};

// -----------------------------------------------------------------------------
// CASH BOOK & BANK/UPI LEDGER
// -----------------------------------------------------------------------------
export const getCashBook = async (
  businessId: string | Types.ObjectId,
  startDate?: string,
  endDate?: string
) => {
  return await getGeneralLedger(businessId, {
    accountCode: CHART_OF_ACCOUNTS.CASH.code,
    startDate,
    endDate,
  });
};

export const getBankUpiLedger = async (
  businessId: string | Types.ObjectId,
  type: 'BANK' | 'UPI',
  startDate?: string,
  endDate?: string
) => {
  const code = type === 'BANK' ? CHART_OF_ACCOUNTS.BANK.code : CHART_OF_ACCOUNTS.UPI.code;
  return await getGeneralLedger(businessId, {
    accountCode: code,
    startDate,
    endDate,
  });
};

// -----------------------------------------------------------------------------
// DAY BOOK (CHRONOLOGICAL TRANSACTION REGISTER)
// -----------------------------------------------------------------------------
export const getDayBook = async (
  businessId: string | Types.ObjectId,
  date?: string
) => {
  const bizId = new Types.ObjectId(businessId);
  const targetDate = date || getTodayDateString();

  const entries = await JournalEntry.find({
    businessId: bizId,
    date: targetDate,
  }).sort({ createdAt: -1 });

  return {
    date: targetDate,
    totalEntries: entries.length,
    entries,
  };
};

// -----------------------------------------------------------------------------
// RECEIVABLE & PAYABLE AGEING REPORTS
// -----------------------------------------------------------------------------
export const getReceivableAgeing = async (
  businessId: string | Types.ObjectId
) => {
  const bizId = new Types.ObjectId(businessId);
  const customers = await Customer.find({ businessId: bizId, status: 'ACTIVE' });
  const today = new Date();

  const report: any[] = [];
  let totalOutstanding = 0;
  let totalCurrent = 0;
  let total1to30 = 0;
  let total31to60 = 0;
  let total61to90 = 0;
  let total90Plus = 0;

  for (const cust of customers) {
    // Deliveries and payments
    const deliveries = await Delivery.find({ businessId: bizId, customerId: cust._id, status: 'DELIVERED' }).sort({ deliveryDate: 1 });
    const payments = await CustomerPayment.find({ businessId: bizId, customerId: cust._id });

    const totalDel = roundMoney(deliveries.reduce((s, d) => s + (d.totalAmount || 0), 0));
    const totalPay = roundMoney(payments.reduce((s, p) => s + (p.amount || 0), 0));
    const outstanding = roundMoney(cust.openingBalance + totalDel - totalPay);

    if (outstanding > 0) {
      totalOutstanding = roundMoney(totalOutstanding + outstanding);

      // Find oldest unpaid delivery date or customer opening balance date
      let oldestDate = cust.customerSince ? new Date(cust.customerSince) : today;
      if (deliveries.length > 0) {
        oldestDate = new Date(deliveries[0].deliveryDate);
      }

      const diffDays = Math.max(0, Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));

      let bucket = 'CURRENT';
      if (diffDays > 90) {
        bucket = '90_PLUS';
        total90Plus = roundMoney(total90Plus + outstanding);
      } else if (diffDays > 60) {
        bucket = '61_90';
        total61to90 = roundMoney(total61to90 + outstanding);
      } else if (diffDays > 30) {
        bucket = '31_60';
        total31to60 = roundMoney(total31to60 + outstanding);
      } else if (diffDays > 0) {
        bucket = '1_30';
        total1to30 = roundMoney(total1to30 + outstanding);
      } else {
        totalCurrent = roundMoney(totalCurrent + outstanding);
      }

      report.push({
        customerId: cust._id.toString(),
        name: cust.name,
        mobile: cust.mobile,
        outstanding,
        ageDays: diffDays,
        bucket,
      });
    }
  }

  return {
    totalOutstanding,
    totalReceivable: totalOutstanding,
    summary: {
      current: totalCurrent,
      days_1_30: total1to30,
      days_31_60: total31to60,
      days_61_90: total61to90,
      days_90_plus: total90Plus,
    },
    customers: report.sort((a, b) => b.outstanding - a.outstanding),
  };
};

export const getPayableAgeing = async (
  businessId: string | Types.ObjectId
) => {
  const bizId = new Types.ObjectId(businessId);
  const suppliers = await Supplier.find({ businessId: bizId, isActive: true });
  const today = new Date();

  const report: any[] = [];
  let totalPayable = 0;
  let totalCurrent = 0;
  let total1to30 = 0;
  let total31to60 = 0;
  let total61to90 = 0;
  let total90Plus = 0;

  for (const supp of suppliers) {
    const purchases = await Purchase.find({ businessId: bizId, supplierId: supp._id }).sort({ purchaseDate: 1 });
    const payments = await SupplierPayment.find({ businessId: bizId, supplierId: supp._id });

    const totalPurch = roundMoney(purchases.reduce((s, p) => s + (p.totalAmount || 0), 0));
    const totalPaid = roundMoney(
      payments.reduce((s, p) => s + (p.amount || 0), 0) +
      purchases.reduce((s, p) => s + (p.paidAmount || 0), 0)
    );
    const payable = roundMoney(supp.openingPayable + totalPurch - totalPaid);

    if (payable > 0) {
      totalPayable = roundMoney(totalPayable + payable);

      let oldestDate = purchases.length > 0 ? new Date(purchases[0].purchaseDate) : today;
      const diffDays = Math.max(0, Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));

      let bucket = 'CURRENT';
      if (diffDays > 90) {
        bucket = '90_PLUS';
        total90Plus = roundMoney(total90Plus + payable);
      } else if (diffDays > 60) {
        bucket = '61_90';
        total61to90 = roundMoney(total61to90 + payable);
      } else if (diffDays > 30) {
        bucket = '31_60';
        total31to60 = roundMoney(total31to60 + payable);
      } else if (diffDays > 0) {
        bucket = '1_30';
        total1to30 = roundMoney(total1to30 + payable);
      } else {
        totalCurrent = roundMoney(totalCurrent + payable);
      }

      report.push({
        supplierId: supp._id.toString(),
        name: supp.name,
        mobile: supp.mobile,
        payable,
        ageDays: diffDays,
        bucket,
      });
    }
  }

  return {
    totalPayable,
    summary: {
      current: totalCurrent,
      days_1_30: total1to30,
      days_31_60: total31to60,
      days_61_90: total61to90,
      days_90_plus: total90Plus,
    },
    suppliers: report.sort((a, b) => b.payable - a.payable),
  };
};

// -----------------------------------------------------------------------------
// INTERNAL TRANSFER (CASH <-> BANK <-> UPI)
// -----------------------------------------------------------------------------
export const recordInternalTransfer = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  params: {
    fromAccount: 'CASH' | 'BANK' | 'UPI';
    toAccount: 'CASH' | 'BANK' | 'UPI';
    amount: number;
    date?: string;
    notes?: string;
  }
) => {
  const bizId = new Types.ObjectId(businessId);
  const amount = roundMoney(Number(params.amount));
  const date = params.date || getTodayDateString();

  if (amount <= 0) {
    throw new AppError('Transfer amount must be greater than zero.', 400);
  }

  if (params.fromAccount === params.toAccount) {
    throw new AppError('Source and destination accounts must be different.', 400);
  }

  const fromCOA = getPaymentAccountByMode(params.fromAccount);
  const toCOA = getPaymentAccountByMode(params.toAccount);

  return await runInTransaction(async (session) => {
    // 1. Post balanced journal: Debit Destination, Credit Source
    const journal = await postJournalEntry(
      {
        businessId: bizId,
        date,
        sourceType: 'TRANSFER',
        narration: `Internal transfer: ${params.fromAccount} -> ${params.toAccount}${params.notes ? ` (${params.notes})` : ''}`,
        lines: [
          {
            accountCode: toCOA.code,
            accountName: toCOA.name,
            accountType: 'ASSET',
            debit: amount,
            credit: 0,
          },
          {
            accountCode: fromCOA.code,
            accountName: fromCOA.name,
            accountType: 'ASSET',
            debit: 0,
            credit: amount,
          },
        ],
        userId,
      },
      session
    );

    // 2. Update financial account balances
    await updateAccountBalance(bizId, params.fromAccount, -amount, session);
    await updateAccountBalance(bizId, params.toAccount, amount, session);

    await logAudit(
      bizId,
      userId,
      'ADMIN',
      'TRANSFER',
      'FinancialAccount',
      journal._id.toString(),
      { from: params.fromAccount, to: params.toAccount, amount },
      session
    );

    return journal;
  });
};

// -----------------------------------------------------------------------------
// RECONCILIATION REPORT (AUTOMATED INTEGRITY CHECKS)
// -----------------------------------------------------------------------------
export const getReconciliationReport = async (
  businessId: string | Types.ObjectId
) => {
  const bizId = new Types.ObjectId(businessId);
  const tb = await getTrialBalance(bizId);
  const bs = await getBalanceSheetStatement(bizId);

  // 1. Reconcile Customer Outstanding
  const customers = await Customer.find({ businessId: bizId });
  let customerDocReceivables = 0;
  for (const c of customers) {
    const dels = await Delivery.find({ businessId: bizId, customerId: c._id, status: 'DELIVERED' });
    const pays = await CustomerPayment.find({ businessId: bizId, customerId: c._id });
    const totD = dels.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const totP = pays.reduce((s, p) => s + (p.amount || 0), 0);
    customerDocReceivables += c.openingBalance + totD - totP;
  }
  customerDocReceivables = roundMoney(customerDocReceivables);

  const tbReceivables = roundMoney(
    (tb.accounts.find((a) => a.code === CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code)?.netDebit || 0) -
    (tb.accounts.find((a) => a.code === CHART_OF_ACCOUNTS.CUSTOMER_RECEIVABLES.code)?.netCredit || 0)
  );

  // 2. Reconcile Supplier Payables
  const suppliers = await Supplier.find({ businessId: bizId });
  let supplierDocPayables = 0;
  for (const s of suppliers) {
    const purs = await Purchase.find({ businessId: bizId, supplierId: s._id });
    const pays = await SupplierPayment.find({ businessId: bizId, supplierId: s._id });
    const totPur = purs.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totPaid = pays.reduce((sum, p) => sum + (p.amount || 0), 0) + purs.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    supplierDocPayables += s.openingPayable + totPur - totPaid;
  }
  supplierDocPayables = roundMoney(supplierDocPayables);

  const tbPayables = roundMoney(
    (tb.accounts.find((a) => a.code === CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code)?.netCredit || 0) -
    (tb.accounts.find((a) => a.code === CHART_OF_ACCOUNTS.SUPPLIER_PAYABLES.code)?.netDebit || 0)
  );

  return {
    timestamp: new Date().toISOString(),
    trialBalanceBalanced: tb.isBalanced,
    balanceSheetBalanced: bs.isBalanced,
    customerReconciliation: {
      documentTotal: customerDocReceivables,
      ledgerTotal: tbReceivables,
      diff: roundMoney(Math.abs(customerDocReceivables - tbReceivables)),
      status: Math.abs(customerDocReceivables - tbReceivables) < 1 ? 'MATCHED' : 'UNRECONCILED',
    },
    supplierReconciliation: {
      documentTotal: supplierDocPayables,
      ledgerTotal: tbPayables,
      diff: roundMoney(Math.abs(supplierDocPayables - tbPayables)),
      status: Math.abs(supplierDocPayables - tbPayables) < 1 ? 'MATCHED' : 'UNRECONCILED',
    },
  };
};
