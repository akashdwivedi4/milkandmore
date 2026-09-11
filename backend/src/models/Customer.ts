import mongoose, { Schema, Document, Types } from 'mongoose';

export type DeliverySchedule = 'MORNING' | 'EVENING' | 'BOTH';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type DeliveryUnit = 'L' | 'ML' | 'KG' | 'G' | 'PCS';

export interface IScheduledProduct {
  productId: Types.ObjectId;
  shift: 'MORNING' | 'EVENING' | 'BOTH';
  quantity: number;
  unit: DeliveryUnit;
  customRate?: number;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  locationAccuracy?: number;
  locationSource?: 'GPS' | 'MANUAL';
  locationUpdatedAt?: Date;
  customerSince: Date;
  serviceEndDate?: Date;
  status: CustomerStatus;
  inactiveReason?: string;
  notes?: string;
  openingBalance: number;
  assignedQr?: string;
  assignedQrId?: Types.ObjectId;
  deliverySchedule: DeliverySchedule;
  scheduledProducts: IScheduledProduct[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    alternateMobile: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    locality: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
    locationAccuracy: { type: Number },
    locationSource: { type: String, enum: ['GPS', 'MANUAL'], default: 'GPS' },
    locationUpdatedAt: { type: Date },
    customerSince: { type: Date, required: true, default: Date.now },
    serviceEndDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    inactiveReason: { type: String, trim: true },
    notes: { type: String, trim: true, default: '' },
    openingBalance: { type: Number, default: 0 },
    assignedQr: { type: String, trim: true },
    assignedQrId: { type: Schema.Types.ObjectId, ref: 'QRCode' },
    deliverySchedule: {
      type: String,
      enum: ['MORNING', 'EVENING', 'BOTH'],
      default: 'MORNING',
      required: true,
    },
    scheduledProducts: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        shift: { type: String, enum: ['MORNING', 'EVENING', 'BOTH'], default: 'BOTH', required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, enum: ['L', 'ML', 'KG', 'G', 'PCS'], default: 'L', required: true },
        customRate: { type: Number, min: 0 },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

CustomerSchema.index({ location: '2dsphere' }, { sparse: true });
CustomerSchema.index({ businessId: 1, mobile: 1 });
CustomerSchema.index({ businessId: 1, status: 1 });
CustomerSchema.index({ businessId: 1, isDeleted: 1 });
CustomerSchema.index({ businessId: 1, assignedQr: 1 });
CustomerSchema.index({ businessId: 1, locality: 1 });
CustomerSchema.index({ businessId: 1, deliverySchedule: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
