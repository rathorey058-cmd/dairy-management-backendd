import { Schema, model, Types } from 'mongoose';

export interface IUser {
  tenantId: Types.ObjectId; // Ref Tenant
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: 'SuperAdmin' | 'Owner' | 'Manager' | 'Accountant' | 'Operator' | 'Sales' | 'Delivery';
  permissions: string[];
  status: 'Active' | 'Inactive';
}

const userSchema = new Schema<IUser>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['SuperAdmin', 'Owner', 'Manager', 'Accountant', 'Operator', 'Sales', 'Delivery'], 
    default: 'Operator' 
  },
  permissions: [{ type: String }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, mobile: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
