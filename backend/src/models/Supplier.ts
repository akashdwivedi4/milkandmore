import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
  openingPayable: number;
  currentPayable: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    openingPayable: { type: Number, default: 0 },
    currentPayable: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ businessId: 1, name: 1 });
SupplierSchema.index({ businessId: 1, mobile: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
