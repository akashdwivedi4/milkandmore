import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomerOtp extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  businessId: Types.ObjectId;
  portalToken: string;
  otpHash: string;
  expiresAt: Date;
  attemptsCount: number;
  maxAttempts: number;
  isUsed: boolean;
  resendCooldownUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerOtpSchema = new Schema<ICustomerOtp>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    portalToken: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attemptsCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    isUsed: { type: Boolean, default: false, index: true },
    resendCooldownUntil: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index to automatically clean up OTP records after 30 minutes
CustomerOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

export const CustomerOtp = mongoose.model<ICustomerOtp>('CustomerOtp', CustomerOtpSchema);
