import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  _id: Types.ObjectId;
  name: string;
  ownerName?: string;
  ownerId?: Types.ObjectId;
  mobile: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
  tagline?: string;
  upiId?: string;
  signature?: string;
  termsAndConditions?: string;
  logo?: string;
  timezone: string;
  currency: string;
  setupCompleted: boolean;
  openingCash: number;
  openingUpi: number;
  openingBank: number;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gstNumber: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },
    upiId: { type: String, trim: true, default: '' },
    signature: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    logo: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    setupCompleted: { type: Boolean, default: false },
    openingCash: { type: Number, default: 0 },
    openingUpi: { type: Number, default: 0 },
    openingBank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Business = mongoose.model<IBusiness>('Business', BusinessSchema);
