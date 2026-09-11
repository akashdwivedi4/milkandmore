import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'OTHER';

export interface IPurchaseItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  normalizedQty: number;
  purchaseRate: number;
  total: number;
}

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  purchaseDate: string; // YYYY-MM-DD
  items: IPurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  payableAmount: number;
  paymentMode: PaymentMethod;
  notes?: string;
  idempotencyKey?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    purchaseDate: { type: String, required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true },
        normalizedQty: { type: Number, required: true, min: 0 },
        purchaseRate: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    payableAmount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'OTHER'], default: 'OTHER' },
    notes: { type: String, trim: true, default: '' },
    idempotencyKey: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseSchema.index({ businessId: 1, purchaseDate: 1 });
PurchaseSchema.index({ businessId: 1, supplierId: 1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
