import mongoose, { Schema, Document } from 'mongoose';

export interface IMilkSaleEntry {
  quantity: number; // in litres
  rate: number;     // price per litre
  amount: number;   // total for this variant
}

export interface IMilkSale extends Document {
  tenantId: mongoose.Types.ObjectId;
  date: Date;
  shift: 'Morning' | 'Evening' | 'Full Day';
  superMilk: IMilkSaleEntry;
  regularMilk: IMilkSaleEntry;
  cowMilk: IMilkSaleEntry;
  totalQuantity: number;
  totalAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  customerName?: string;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilkSaleEntrySchema = new Schema<IMilkSaleEntry>({
  quantity: { type: Number, required: true, default: 0 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const MilkSaleSchema = new Schema<IMilkSale>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  shift: { type: String, enum: ['Morning', 'Evening', 'Full Day'], default: 'Morning' },
  superMilk: { type: MilkSaleEntrySchema, required: true },
  regularMilk: { type: MilkSaleEntrySchema, required: true },
  cowMilk: { type: MilkSaleEntrySchema, required: true },
  totalQuantity: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Credit'], default: 'Cash' },
  customerName: { type: String, default: 'Counter / Bulk Buyers' },
  notes: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const MilkSale = mongoose.model<IMilkSale>('MilkSale', MilkSaleSchema);
