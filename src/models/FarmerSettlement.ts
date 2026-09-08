import { Schema, model, Types } from 'mongoose';

export interface IFarmerSettlement {
  tenantId: Types.ObjectId;
  farmer: Types.ObjectId;
  date: Date;
  milkValue: number;
  advanceAdjusted: number;
  alreadyPaid: number;
  netPayable: number;
  amountPaid: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
  referenceNumber?: string;
  notes?: string;
}

const farmerSettlementSchema = new Schema<IFarmerSettlement>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  milkValue: { type: Number, required: true },
  advanceAdjusted: { type: Number, required: true, default: 0 },
  alreadyPaid: { type: Number, required: true, default: 0 },
  netPayable: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
  referenceNumber: { type: String },
  notes: { type: String }
}, { timestamps: true });

export const FarmerSettlement = model<IFarmerSettlement>('FarmerSettlement', farmerSettlementSchema);
