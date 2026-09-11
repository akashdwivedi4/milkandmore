import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'MILKMAN';

export interface IUser extends Document {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  mobile?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    mobile: { type: String, trim: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'STAFF', 'MILKMAN'],
      default: 'STAFF',
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ businessId: 1, role: 1 });

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
