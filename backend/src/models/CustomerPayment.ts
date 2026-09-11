import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'OTHER';

export interface ICustomerPayment extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
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

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
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

CustomerPaymentSchema.index({ businessId: 1, customerId: 1 });
CustomerPaymentSchema.index({ businessId: 1, paymentDate: 1 });
CustomerPaymentSchema.index({ businessId: 1, idempotencyKey: 1 }, { sparse: true });

export const CustomerPayment = mongoose.model<ICustomerPayment>('CustomerPayment', CustomerPaymentSchema);
