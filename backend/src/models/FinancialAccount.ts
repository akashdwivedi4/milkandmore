import mongoose, { Schema, Document, Types } from 'mongoose';

export type AccountType = 'CASH' | 'UPI' | 'BANK';

export interface IFinancialAccount extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  accountType: AccountType;
  openingBalance: number;
  currentBalance: number;
  updatedAt: Date;
}

const FinancialAccountSchema = new Schema<IFinancialAccount>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    accountType: { type: String, enum: ['CASH', 'UPI', 'BANK'], required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FinancialAccountSchema.index({ businessId: 1, accountType: 1 }, { unique: true });

export const FinancialAccount = mongoose.model<IFinancialAccount>('FinancialAccount', FinancialAccountSchema);
