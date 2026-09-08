import { Schema, model, Types } from 'mongoose';

export interface IFarmer {
  tenantId: Types.ObjectId;
  farmerId: string; // E.g., F-0001
  name: string;
  mobile: string;
  village: string;
  address?: string;
  bankAccount?: string;
  ifsc?: string;
  upi?: string;
  joiningDate: Date;
  status: 'Active' | 'Inactive';
  openingBalance: number; // positive payable, negative receivable
  openingAdvance: number;
  fatRate?: number; // Custom FAT rate (e.g. ₹10 per FAT)
  notes?: string;
}

const farmerSchema = new Schema<IFarmer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmerId: { type: String, required: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  village: { type: String, required: true },
  address: { type: String },
  bankAccount: { type: String },
  ifsc: { type: String },
  upi: { type: String },
  joiningDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  openingBalance: { type: Number, required: true, default: 0 },
  openingAdvance: { type: Number, required: true, default: 0 },
  fatRate: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

farmerSchema.index({ tenantId: 1, farmerId: 1 }, { unique: true });

export const Farmer = model<IFarmer>('Farmer', farmerSchema);
