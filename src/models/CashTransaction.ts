import { Schema, model, Types } from 'mongoose';

export interface ICashTransaction {
  tenantId: Types.ObjectId;
  date: Date;
  type: 'CASH_SALE' | 'CUSTOMER_COLLECTION' | 'FARMER_PAYMENT' | 'EXPENSE' | 'OTHER_IN' | 'OTHER_OUT';
  amount: number; // positive for cash in, negative for cash out
  description: string;
  referenceId?: Types.ObjectId; // Ref to Order, FarmerPayment, Expense, etc.
}

const cashTransactionSchema = new Schema<ICashTransaction>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  type: { 
    type: String, 
    enum: ['CASH_SALE', 'CUSTOMER_COLLECTION', 'FARMER_PAYMENT', 'EXPENSE', 'OTHER_IN', 'OTHER_OUT'], 
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  referenceId: { type: Schema.Types.ObjectId }
}, { timestamps: true });

cashTransactionSchema.index({ tenantId: 1, date: -1 });

export const CashTransaction = model<ICashTransaction>('CashTransaction', cashTransactionSchema);
