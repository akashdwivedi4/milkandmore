import mongoose, { Schema, Document, Types } from 'mongoose';

export type StockMovementType =
  | 'PURCHASE'
  | 'DELIVERY'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'DELIVERY_REVERSAL'
  | 'PURCHASE_REVERSAL';

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  unit: string;
  normalizedQty: number; // positive = stock added, negative = stock deducted
  previousStock: number;
  newStock: number;
  referenceId?: Types.ObjectId;
  referenceType?: string;
  reason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: {
      type: String,
      enum: [
        'PURCHASE',
        'DELIVERY',
        'ADJUSTMENT',
        'RETURN',
        'DELIVERY_REVERSAL',
        'PURCHASE_REVERSAL',
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    normalizedQty: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    referenceType: { type: String },
    reason: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

StockMovementSchema.index({ businessId: 1, productId: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
