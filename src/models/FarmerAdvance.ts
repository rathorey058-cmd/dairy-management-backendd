import { Schema, model, Types } from 'mongoose';

export interface IFarmerAdvance {
  tenantId: Types.ObjectId;
  farmer: Types.ObjectId; // Ref Farmer
  date: Date;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
  referenceNumber?: string;
  remainingAdvance: number;
  notes?: string;
}

const farmerAdvanceSchema = new Schema<IFarmerAdvance>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
  referenceNumber: { type: String },
  remainingAdvance: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

export const FarmerAdvance = model<IFarmerAdvance>('FarmerAdvance', farmerAdvanceSchema);
