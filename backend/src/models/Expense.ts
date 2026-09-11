import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  category: string;
  description: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  paymentMode: 'CASH' | 'UPI' | 'BANK';
  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    expenseDate: { type: String, required: true, index: true },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK'], default: 'CASH', required: true },
    notes: { type: String, trim: true, default: '' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ExpenseSchema.index({ businessId: 1, expenseDate: 1 });
ExpenseSchema.index({ businessId: 1, category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
