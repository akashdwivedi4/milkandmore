import mongoose, { Schema, Document, Types } from 'mongoose';

export type ProductUnit = 'L' | 'ML' | 'KG' | 'G' | 'PCS';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  category: string;
  defaultUnit: ProductUnit;
  defaultRate: number;
  currentStock: number;
  averageCost: number; // Weighted Average Cost for COGS valuation
  minStockAlert: number;
  taxPercent: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'Dairy', trim: true },
    defaultUnit: { type: String, enum: ['L', 'ML', 'KG', 'G', 'PCS'], default: 'L', required: true },
    defaultRate: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, default: 0 },
    averageCost: { type: Number, default: 0, min: 0 },
    minStockAlert: { type: Number, default: 10 },
    taxPercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

ProductSchema.index({ businessId: 1, name: 1 }, { unique: true });
ProductSchema.index({ businessId: 1, isActive: 1 });
ProductSchema.index({ businessId: 1, isDeleted: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
