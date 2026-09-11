import mongoose, { Schema, Document, Types } from 'mongoose';
import { roundMoney, safeSubtract } from '../utils/math';

export type JournalSourceType =
  | 'DELIVERY'
  | 'CUSTOMER_PAYMENT'
  | 'PURCHASE'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE'
  | 'OWNER_CAPITAL'
  | 'OPENING_BALANCE'
  | 'TRANSFER'
  | 'ADJUSTMENT';

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface IJournalLine {
  accountCode: string;
  accountName: string;
  accountType: AccountCategory;
  debit: number;
  credit: number;
  partyType?: 'CUSTOMER' | 'SUPPLIER' | 'NONE';
  partyId?: Types.ObjectId;
  partyName?: string;
}

export interface IJournalEntry extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  sourceType: JournalSourceType;
  sourceId?: Types.ObjectId | string;
  narration: string;
  lines: IJournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy?: Types.ObjectId;
  isReversed: boolean;
  reversalOfEntryId?: Types.ObjectId;
  reversedByEntryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JournalLineSchema = new Schema<IJournalLine>(
  {
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    accountType: {
      type: String,
      enum: ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'],
      required: true,
    },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    partyType: { type: String, enum: ['CUSTOMER', 'SUPPLIER', 'NONE'], default: 'NONE' },
    partyId: { type: Schema.Types.ObjectId },
    partyName: { type: String },
  },
  { _id: false }
);

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    entryNumber: { type: String, required: true },
    date: { type: String, required: true, index: true },
    sourceType: {
      type: String,
      enum: [
        'DELIVERY',
        'CUSTOMER_PAYMENT',
        'PURCHASE',
        'SUPPLIER_PAYMENT',
        'EXPENSE',
        'OWNER_CAPITAL',
        'OPENING_BALANCE',
        'TRANSFER',
        'ADJUSTMENT',
      ],
      required: true,
      index: true,
    },
    sourceId: { type: String, index: true },
    narration: { type: String, required: true },
    lines: {
      type: [JournalLineSchema],
      validate: {
        validator: function (lines: IJournalLine[]) {
          return lines && lines.length >= 2;
        },
        message: 'A journal entry must contain at least 2 lines.',
      },
    },
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isReversed: { type: Boolean, default: false, index: true },
    reversalOfEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
    reversedByEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  },
  { timestamps: true }
);

// Enforce double-entry invariant: totalDebit === totalCredit
JournalEntrySchema.pre('validate', function () {
  if (this.lines && this.lines.length > 0) {
    let sumDebit = 0;
    let sumCredit = 0;
    for (const line of this.lines) {
      line.debit = roundMoney(line.debit || 0);
      line.credit = roundMoney(line.credit || 0);
      sumDebit += line.debit;
      sumCredit += line.credit;
    }
    this.totalDebit = roundMoney(sumDebit);
    this.totalCredit = roundMoney(sumCredit);

    if (Math.abs(safeSubtract(this.totalDebit, this.totalCredit)) > 0.001) {
      throw new Error(
        `Unbalanced journal entry! Total Debit (${this.totalDebit}) must equal Total Credit (${this.totalCredit}).`
      );
    }

    if (this.totalDebit <= 0) {
      throw new Error('Journal entry amount must be greater than zero.');
    }
  }
});

JournalEntrySchema.index({ businessId: 1, date: 1 });
JournalEntrySchema.index({ businessId: 1, sourceType: 1, sourceId: 1 });
JournalEntrySchema.index({ businessId: 1, 'lines.accountCode': 1 });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
