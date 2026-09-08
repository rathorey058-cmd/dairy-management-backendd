import { Schema, model, Types } from 'mongoose';

export interface IExpense {
  tenantId: Types.ObjectId;
  date: Date;
  category: string;
  description: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
  referenceNumber?: string;
  operator: Types.ObjectId; // Ref User
}

const expenseSchema = new Schema<IExpense>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
  referenceNumber: { type: String },
  operator: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

expenseSchema.index({ tenantId: 1, date: -1 });

export const Expense = model<IExpense>('Expense', expenseSchema);
