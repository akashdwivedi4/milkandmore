import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomerRate extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  productId: Types.ObjectId;
  customRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerRateSchema = new Schema<ICustomerRate>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    customRate: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

CustomerRateSchema.index({ businessId: 1, customerId: 1, productId: 1 }, { unique: true });

export const CustomerRate = mongoose.model<ICustomerRate>('CustomerRate', CustomerRateSchema);
