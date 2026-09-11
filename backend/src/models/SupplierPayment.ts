import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMode } from './CustomerPayment';

export interface ISupplierPayment extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  idempotencyKey?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierPaymentSchema = new Schema<ISupplierPayment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    paymentDate: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'OTHER'], default: 'CASH', required: true },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true, default: '' },
    idempotencyKey: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SupplierPaymentSchema.index({ businessId: 1, supplierId: 1 });
SupplierPaymentSchema.index({ businessId: 1, paymentDate: 1 });
SupplierPaymentSchema.index({ businessId: 1, idempotencyKey: 1 }, { sparse: true });

export const SupplierPayment = mongoose.model<ISupplierPayment>('SupplierPayment', SupplierPaymentSchema);
