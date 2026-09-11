export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'MILKMAN';

export interface Business {
  id: string;
  name: string;
  slug?: string;
  ownerName?: string;
  owner_name?: string;
  mobile?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  gstNumber?: string | null;
  state?: string | null;
  tagline?: string | null;
  upiId?: string | null;
  upi_id?: string | null;
  signature?: string | null;
  termsAndConditions?: string | null;
  terms_and_conditions?: string | null;
  logo_url?: string | null;
  logo?: string;
  timezone: string;
  currency?: string;
  setupCompleted?: boolean;
  setup_completed?: boolean;
  allow_negative_stock?: boolean;
  opening_cash?: number;
  opening_bank?: number;
  opening_upi?: number;
  openingCash?: number;
  openingBank?: number;
  openingUpi?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface ProductUnitConversion {
  unit: string;
  factor: number;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  base_unit: string;
  supported_units: ProductUnitConversion[];
  default_rate: number;
  current_stock: number;
  low_stock_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSummary {
  customerId: string;
  customerName: string;
  mobile: string;
  address?: string | null;
  openingBalance?: number;
  previousBalance: number;
  todayDeliveriesCount: number;
  todayDeliveryAmount: number;
  totalDeliveriesCount: number;
  totalDeliveryAmount: number;
  totalPayments: number;
  currentOutstanding: number;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  address?: string | null;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  qr_token: string;
  assigned_qr?: string;
  assignedQr?: string;
  active: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  deliverySchedule?: 'MORNING' | 'EVENING' | 'BOTH';
  delivery_schedule?: 'MORNING' | 'EVENING' | 'BOTH';
  scheduledProducts?: any[];
  scheduled_products?: any[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  locationAccuracy?: number;
  customer_since: string;
  service_end_date?: string | null;
  ending_reason?: string | null;
  opening_balance?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  summary?: CustomerSummary;
}

export interface CustomerRateItem {
  product_id: string;
  product_name: string;
  base_unit: string;
  default_rate: number;
  custom_rate: number | null;
  effective_rate: number;
  is_custom: boolean;
}

export interface DeliveryItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit: string;
  normalized_quantity?: number;
  rate: number;
  amount: number;
  product?: Product;
}

export interface Delivery {
  id: string;
  business_id: string;
  customer_id: string;
  delivered_at: string;
  delivery_date: string;
  shift?: 'MORNING' | 'EVENING' | string;
  status?: string;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  customer?: Customer;
  items?: DeliveryItem[];
  isAdditional?: boolean;
  is_additional?: boolean;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank' | 'Other';

export interface Payment {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  payment_date: string;
  notes?: string | null;
  customer?: Customer;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  mobile: string;
  address?: string | null;
  notes?: string | null;
  opening_payable: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_purchases?: number;
  total_payments?: number;
  current_payable?: number;
}

export interface SupplierPayment {
  id: string;
  business_id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  supplier?: Supplier;
}

export type ExpenseCategory =
  | 'Electricity'
  | 'Transport'
  | 'Salary'
  | 'Packaging'
  | 'Maintenance'
  | 'Rent'
  | 'Other';

export interface Expense {
  id: string;
  business_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  business_id: string;
  product_id: string;
  supplier_id?: string | null;
  supplier?: string | null;
  quantity: number;
  unit: string;
  normalized_quantity: number;
  purchase_cost: number;
  total_amount?: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_mode?: PaymentMethod;
  purchased_at: string;
  notes?: string | null;
  created_at?: string;
  product?: Product;
  supplier_rel?: Supplier;
}

export interface DashboardMetrics {
  totalCustomers: number;
  deliveredCustomers: number;
  remainingCustomers: number;
  deliveryProgress: string;
  deliveryEntries: number;
  todaySales: number;
  todayCollection: number;
  totalOutstanding: number;
  supplierPayable?: number;
  todayPurchases?: number;
  todayExpenses?: number;
  todayProfit?: number;
  cashBalance?: number;
  upiBalance?: number;
  bankBalance?: number;
  lowStockCount?: number;
}

export interface AccountBalances {
  opening_cash: number;
  opening_upi: number;
  opening_bank: number;
  current_cash: number;
  current_upi: number;
  current_bank: number;
  total_cash_upi_bank: number;
}

export interface ProfitAndLossReport {
  period: { start_date: string; end_date: string };
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  expenses_by_category: Record<string, number>;
  net_profit: number;
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: {
    cash: number;
    upi: number;
    bank: number;
    customer_receivables: number;
    inventory_value: number;
    total_assets: number;
  };
  liabilities: {
    supplier_payables: number;
    other_liabilities: number;
    total_liabilities: number;
  };
  net_position: number;
}

export interface BillItem {
  id: string;
  deliveryId?: string;
  date: string;
  deliveredAt?: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  shift?: string;
  isAdditional?: boolean;
}

export interface BillPaymentItem {
  id: string;
  paidAt: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
}

export interface CustomerBillStatement {
  business: {
    id?: string;
    name: string;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    address?: string | null;
    gstNumber?: string | null;
    gstin?: string | null;
    state?: string | null;
    tagline?: string | null;
    upiId?: string | null;
    signature?: string | null;
    termsAndConditions?: string | null;
    logoUrl?: string | null;
    logo?: string | null;
    currency?: string;
  };
  customer: {
    id: string;
    name: string;
    mobile: string;
    address?: string | null;
    openingBalance?: number;
    customerSince?: string | Date;
  };
  period: {
    startDate?: string | null;
    endDate?: string | null;
    label: string;
  };
  items: BillItem[];
  payments: BillPaymentItem[];
  deliveries?: any[];
  entries?: any[];
  openingBalance?: number;
  totalDeliveryCharges?: number;
  totalCustomerPayments?: number;
  currentOutstanding?: number;
  summary: {
    openingBalance?: number;
    previousBalance: number;
    todayDropsCount?: number;
    todayDeliveryAmount?: number;
    todayDrops?: {
      count: number;
      amount: number;
    };
    totalDeliveriesCount?: number;
    periodDeliveryAmount: number;
    totalDeliveries?: {
      count: number;
      amount: number;
    };
    totalPaymentsCount?: number;
    periodPaymentsAmount: number;
    finalOutstanding: number;
    amountDue: number;
    netPayable?: number;
  };
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// MILK & MORE ENTERPRISE DOUBLE-ENTRY ACCOUNTING TYPES
// -----------------------------------------------------------------------------
export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface ChartAccount {
  code: string;
  name: string;
  type: AccountCategory;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  accountType: AccountCategory;
  debit: number;
  credit: number;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'NONE';
  partyId?: string;
  partyName?: string;
}

export interface JournalEntry {
  _id?: string;
  id?: string;
  entryNumber: string;
  date: string;
  sourceType: string;
  sourceId?: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isReversed: boolean;
  createdAt?: string;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountCategory;
  debit: number;
  credit: number;
}

export interface TrialBalanceData {
  asOfDate: string;
  isBalanced: boolean;
  grandTotalDebit: number;
  grandTotalCredit: number;
  totalDebit?: number;
  totalCredit?: number;
  difference: number;
  accounts: TrialBalanceRow[];
}

export interface ProfitAndLossData {
  period: { startDate: string; endDate: string };
  revenue: {
    total: number;
    breakdown: Record<string, number>;
  };
  cogs: {
    total: number;
    breakdown: Record<string, number>;
  };
  grossProfit: number;
  operatingExpenses: {
    total: number;
    breakdown: Record<string, number>;
  };
  netProfit: number;
}

export interface BalanceSheetData {
  asOfDate: string;
  isBalanced: boolean;
  assets: {
    total: number;
    breakdown: Record<string, number>;
  };
  liabilities: {
    total: number;
    breakdown: Record<string, number>;
  };
  equity: {
    total: number;
    breakdown: Record<string, number>;
  };
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
}

export interface CashBookData {
  period: { startDate: string; endDate: string };
  openingBalance: number;
  closingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  entries: {
    date: string;
    entryNumber: string;
    narration: string;
    sourceType: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
}

export interface BankUpiLedgerData {
  accountType: 'BANK' | 'UPI';
  accountName: string;
  period: { startDate: string; endDate: string };
  openingBalance: number;
  closingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  entries: {
    date: string;
    entryNumber: string;
    narration: string;
    sourceType: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
}

export interface DayBookData {
  date: string;
  totalDebit: number;
  totalCredit: number;
  entries: JournalEntry[];
}

export interface AgeingCustomer {
  customerId: string;
  name: string;
  mobile: string;
  outstanding: number;
  ageDays: number;
  bucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';
}

export interface ReceivableAgeingData {
  totalOutstanding: number;
  totalReceivable?: number;
  summary: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  customers: AgeingCustomer[];
}

export interface AgeingSupplier {
  supplierId: string;
  name: string;
  mobile: string;
  payable: number;
  ageDays: number;
  bucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '90_PLUS';
}

export interface PayableAgeingData {
  totalPayable: number;
  summary: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  };
  suppliers: AgeingSupplier[];
}

