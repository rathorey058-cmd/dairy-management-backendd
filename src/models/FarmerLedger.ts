import { Schema, model, Types } from 'mongoose';

export interface IFarmerLedger {
  tenantId: Types.ObjectId;
  farmer: Types.ObjectId; // Ref Farmer
  date: Date;
  description: string;
  transactionType: 'MILK_SUPPLY' | 'ADVANCE_GIVEN' | 'PAYMENT_MADE' | 'ADJUSTMENT';
  amount: number; // positive for credit/milk supplied (payable increases), negative for payments/advances (payable decreases)
  balance: number; // Running balance (payable to farmer)
  referenceId?: Types.ObjectId; // E.g., MilkCollection, FarmerAdvance, FarmerPayment, or FarmerSettlement
  notes?: string;
}

const farmerLedgerSchema = new Schema<IFarmerLedger>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  description: { type: String, required: true },
  transactionType: { 
    type: String, 
    enum: ['MILK_SUPPLY', 'ADVANCE_GIVEN', 'PAYMENT_MADE', 'ADJUSTMENT'], 
    required: true 
  },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  referenceId: { type: Schema.Types.ObjectId },
  notes: { type: String }
}, { timestamps: true });

farmerLedgerSchema.index({ tenantId: 1, farmer: 1, date: 1 });

export const FarmerLedger = model<IFarmerLedger>('FarmerLedger', farmerLedgerSchema);
