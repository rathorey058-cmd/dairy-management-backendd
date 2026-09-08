import { Schema, model, Types } from 'mongoose';

export interface ICustomerLedger {
  tenantId: Types.ObjectId;
  customer: Types.ObjectId; // Ref Customer
  date: Date;
  description: string;
  type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
  amount: number; // positive for debit/invoices (outstanding increases), negative for credit/payments (outstanding decreases)
  balance: number; // Running outstanding balance
  referenceId?: Types.ObjectId; // Ref to Order or special Payment slips
}

const customerLedgerSchema = new Schema<ICustomerLedger>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['INVOICE', 'PAYMENT', 'ADJUSTMENT'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  referenceId: { type: Schema.Types.ObjectId }
}, { timestamps: true });

customerLedgerSchema.index({ tenantId: 1, customer: 1, date: 1 });

export const CustomerLedger = model<ICustomerLedger>('CustomerLedger', customerLedgerSchema);
