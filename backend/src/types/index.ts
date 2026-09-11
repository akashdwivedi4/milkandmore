import { Request } from 'express';

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'MILKMAN';

export interface Business {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  logo_url?: string | null;
  timezone: string;
  allow_negative_stock: boolean;
  opening_cash?: number;
  opening_bank?: number;
  opening_upi?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // auth.users.id
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductUnitConversion {
  unit: string;
  factor: number; // multiplier to get base unit (e.g. ML -> L factor is 0.001)
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  base_unit: string; // 'L' | 'KG'
  supported_units: ProductUnitConversion[];
  default_rate: number;
  current_stock: number;
  low_stock_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  mobile: string;
  address?: string | null;
  qr_token: string;
  active: boolean;
  notes?: string | null;
  customer_since: string; // YYYY-MM-DD
  service_end_date?: string | null; // YYYY-MM-DD
  ending_reason?: string | null;
  opening_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerRate {
  id: string;
  business_id: string;
  customer_id: string;
  product_id: string;
  custom_rate: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryItemInput {
  product_id: string;
  quantity: number;
  unit: string;
  normalized_quantity?: number;
  rate?: number;
  amount?: number;
}

export interface DeliveryItem extends DeliveryItemInput {
  id: string;
  delivery_id: string;
  normalized_quantity: number;
  rate: number;
  amount: number;
  created_at: string;
  product?: Product;
}

export interface Delivery {
  id: string;
  business_id: string;
  customer_id: string;
  delivered_at: string;
  delivery_date: string;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: DeliveryItem[];
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
  created_by?: string | null;
  notes?: string | null;
  created_at: string;
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
  summary?: {
    totalPurchases: number;
    totalPayments: number;
    currentPayable: number;
  };
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
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_mode: PaymentMethod;
  purchased_at: string;
  created_by?: string | null;
  notes?: string | null;
  created_at: string;
  product?: Product;
  supplier_rel?: Supplier;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'PURCHASE_EDIT'
  | 'PURCHASE_DELETE'
  | 'DELIVERY'
  | 'DELIVERY_EDIT'
  | 'DELIVERY_DELETE'
  | 'MANUAL_ADJUSTMENT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'REVERSAL';

export interface StockMovement {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  business_id: string;
  role: UserRole;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
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

export interface DashboardMetrics {
  totalCustomers: number;
  deliveredCustomers: number;
  remainingCustomers: number;
  deliveryProgress: string; // e.g. "32/50"
  deliveryEntries: number;
  todaySales: number;
  todayCollection: number;
  totalOutstanding: number;
  supplierPayable: number;
  todayPurchases: number;
  todayExpenses: number;
  todayProfit: number;
  cashBalance: number;
  upiBalance: number;
  bankBalance: number;
  lowStockCount: number;
}
