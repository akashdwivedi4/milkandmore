import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchaseReturnItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  normalizedQty: number;
  purchaseRate: number;
  total: number;
}

export interface IPurchaseReturn extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  purchaseId?: Types.ObjectId;
  returnDate: string; // YYYY-MM-DD
  items: IPurchaseReturnItem[];
  totalAmount: number;
  reason?: string;
  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnSchema = new Schema<IPurchaseReturn>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    returnDate: { type: String, required: true, index: true },
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
    reason: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseReturnSchema.index({ businessId: 1, returnDate: 1 });
PurchaseReturnSchema.index({ businessId: 1, supplierId: 1 });

export const PurchaseReturn = mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);
