import mongoose, { Schema, Document, Types } from 'mongoose';

export type QRStatus = 'UNUSED' | 'ASSIGNED' | 'DISABLED';

export interface IQRCode extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  qrCode: string;
  status: QRStatus;
  generatedAt: Date;
  assignedCustomerId?: Types.ObjectId;
  assignedAt?: Date;
  disabledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema = new Schema<IQRCode>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    qrCode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['UNUSED', 'ASSIGNED', 'DISABLED'],
      default: 'UNUSED',
      required: true,
      index: true,
    },
    generatedAt: { type: Date, default: Date.now },
    assignedCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    assignedAt: { type: Date },
    disabledAt: { type: Date },
  },
  { timestamps: true }
);

QRCodeSchema.index({ businessId: 1, qrCode: 1 }, { unique: true });
QRCodeSchema.index({ businessId: 1, status: 1 });

export const QRCode = mongoose.model<IQRCode>('QRCode', QRCodeSchema);
