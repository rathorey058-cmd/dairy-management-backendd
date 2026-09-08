import { Schema, model, Types } from 'mongoose';

export interface ICustomer {
  tenantId: Types.ObjectId;
  name: string;
  mobile: string;
  whatsappNumber?: string;
  address?: string;
  area?: string;
  creditLimit: number;
  outstandingBalance: number; // positive represents amount customer owes to dairy
}

const customerSchema = new Schema<ICustomer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsappNumber: { type: String },
  address: { type: String },
  area: { type: String },
  creditLimit: { type: Number, required: true, default: 0 },
  outstandingBalance: { type: Number, required: true, default: 0 }
}, { timestamps: true });

customerSchema.index({ tenantId: 1, mobile: 1 }, { unique: true });

export const Customer = model<ICustomer>('Customer', customerSchema);
