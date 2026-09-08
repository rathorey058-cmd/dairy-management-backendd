import { Schema, model, Types } from 'mongoose';

export interface IFarmerPayment {
  tenantId: Types.ObjectId;
  farmer: Types.ObjectId; // Ref Farmer
  date: Date;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
  referenceNumber?: string;
  notes?: string;
}

const farmerPaymentSchema = new Schema<IFarmerPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
  referenceNumber: { type: String },
  notes: { type: String }
}, { timestamps: true });

export const FarmerPayment = model<IFarmerPayment>('FarmerPayment', farmerPaymentSchema);
