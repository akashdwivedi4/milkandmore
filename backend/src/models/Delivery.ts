import mongoose, { Schema, Document, Types } from 'mongoose';
import { DeliveryUnit } from './Customer';

export type DeliveryShift = 'MORNING' | 'EVENING';
export type DeliveryRecordStatus = 'SCHEDULED' | 'PENDING' | 'DELIVERED' | 'MISSED' | 'CANCELLED';

export interface IDeliveryItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unit: DeliveryUnit;
  normalizedQty: number; // e.g. 500ML -> 0.5L, 250G -> 0.25KG
  rate: number;
  amount: number;
}

export interface IDelivery extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  deliveryDate: string; // YYYY-MM-DD
  shift: DeliveryShift;
  status: DeliveryRecordStatus;
  items: IDeliveryItem[];
  totalAmount: number;
  notes?: string;
  deliveredByUserId?: Types.ObjectId;
  deliveredAt?: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  isAdditional: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    deliveryDate: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    shift: { type: String, enum: ['MORNING', 'EVENING'], required: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'PENDING', 'DELIVERED', 'MISSED', 'CANCELLED'],
      default: 'DELIVERED',
      required: true,
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, enum: ['L', 'ML', 'KG', 'G', 'PCS'], required: true },
        normalizedQty: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
    deliveredByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    isAdditional: { type: Boolean, default: false },
    idempotencyKey: { type: String, trim: true },
  },
  { timestamps: true }
);

DeliverySchema.index({ businessId: 1, deliveryDate: 1 });
DeliverySchema.index({ businessId: 1, customerId: 1, deliveryDate: 1, shift: 1 });
DeliverySchema.index({ businessId: 1, idempotencyKey: 1 }, { sparse: true });

export const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);
