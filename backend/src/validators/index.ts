import { z } from 'zod';
import { getTodayDateString } from '../utils/date';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits').max(15),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customer_since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Customer Since must be in YYYY-MM-DD format').optional(),
  service_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service End Date must be in YYYY-MM-DD format').optional().nullable(),
  ending_reason: z.string().optional().nullable(),
  opening_balance: z.number().optional(),
}).refine((data) => {
  const today = getTodayDateString('Asia/Kolkata');
  if (data.customer_since && data.customer_since > today) {
    return false;
  }
  return true;
}, {
  message: 'Customer Since cannot be in the future',
  path: ['customer_since'],
}).refine((data) => {
  const today = getTodayDateString('Asia/Kolkata');
  if (data.service_end_date && data.service_end_date > today) {
    return false;
  }
  return true;
}, {
  message: 'Service End Date cannot be in the future',
  path: ['service_end_date'],
}).refine((data) => {
  if (data.service_end_date && data.customer_since && data.service_end_date < data.customer_since) {
    return false;
  }
  return true;
}, {
  message: 'Service End Date cannot be earlier than Customer Since',
  path: ['service_end_date'],
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100).optional(),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits').max(15).optional(),
  address: z.string().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  customer_since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Customer Since must be in YYYY-MM-DD format').optional(),
  service_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service End Date must be in YYYY-MM-DD format').optional().nullable(),
  ending_reason: z.string().optional().nullable(),
  opening_balance: z.number().optional(),
}).refine((data) => {
  const today = getTodayDateString('Asia/Kolkata');
  if (data.customer_since && data.customer_since > today) {
    return false;
  }
  return true;
}, {
  message: 'Customer Since cannot be in the future',
  path: ['customer_since'],
}).refine((data) => {
  const today = getTodayDateString('Asia/Kolkata');
  if (data.service_end_date && data.service_end_date > today) {
    return false;
  }
  return true;
}, {
  message: 'Service End Date cannot be in the future',
  path: ['service_end_date'],
}).refine((data) => {
  if (data.service_end_date && data.customer_since && data.service_end_date < data.customer_since) {
    return false;
  }
  return true;
}, {
  message: 'Service End Date cannot be earlier than Customer Since',
  path: ['service_end_date'],
});

export const productUnitSchema = z.object({
  unit: z.string().min(1),
  factor: z.number().positive(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(100),
  base_unit: z.enum(['L', 'KG']),
  supported_units: z.array(productUnitSchema).min(1, 'At least one supported unit is required'),
  default_rate: z.number().min(0, 'Default rate must be non-negative'),
  current_stock: z.number().min(0, 'Current stock must be non-negative').default(0),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  supported_units: z.array(productUnitSchema).optional(),
  default_rate: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const deliveryItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().min(0, 'Rate must be non-negative').optional(),
});

export const createDeliverySchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  notes: z.string().optional().nullable(),
  items: z.array(deliveryItemSchema).min(1, 'At least one delivery item is required'),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const editDeliverySchema = z.object({
  notes: z.string().optional().nullable(),
  items: z.array(deliveryItemSchema).min(1, 'At least one delivery item is required'),
});

export const createPurchaseSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  purchase_cost: z.number().min(0, 'Purchase cost must be non-negative'),
  supplier_id: z.string().uuid().optional().nullable(),
  supplier: z.string().optional().nullable(),
  total_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  balance_amount: z.number().optional(),
  payment_mode: z.enum(['Cash', 'UPI', 'Bank', 'Other']).optional(),
  notes: z.string().optional().nullable(),
  purchased_at: z.string().optional(),
});

export const createPaymentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_method: z.string().transform((val) => {
    const v = (val || '').toLowerCase();
    if (v === 'cash') return 'Cash' as const;
    if (v === 'upi') return 'UPI' as const;
    if (v === 'bank') return 'Bank' as const;
    return 'Other' as const;
  }),
  notes: z.string().optional().nullable(),
  paid_at: z.string().optional(),
});

export const setCustomerRateSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  product_id: z.string().uuid('Invalid product ID'),
  custom_rate: z.number().min(0, 'Custom rate must be non-negative'),
});

export const updateBusinessSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  gst_number: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  timezone: z.string().min(1).optional(),
  allow_negative_stock: z.boolean().optional(),
  opening_cash: z.number().optional(),
  opening_bank: z.number().optional(),
  opening_upi: z.number().optional(),
});

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'STAFF', 'MILKMAN']),
});
