import { Schema, model, Types, Document } from 'mongoose';

export interface IMilkBandhi extends Document {
  tenantId: Types.ObjectId;
  bandhiNo: number; // e.g. 1, 2, 3, 4, 5, 6, 7
  customerName: string;
  mobile: string;
  address?: string;
  area?: string;
  milkType: 'Buffalo' | 'Cow' | 'Mixed';
  shift: 'Morning' | 'Evening' | 'Both';
  dailyQuantity: number; // in Litres (e.g. 1.0, 2.0, 1.5)
  rate: number; // Price per Litre (e.g. ₹65)
  status: 'Active' | 'Paused';
  customer?: Types.ObjectId; // Ref to Customer model
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const milkBandhiSchema = new Schema<IMilkBandhi>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bandhiNo: { type: Number, required: true },
    customerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    milkType: {
      type: String,
      enum: ['Buffalo', 'Cow', 'Mixed'],
      default: 'Buffalo',
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Both'],
      default: 'Morning',
    },
    dailyQuantity: { type: Number, required: true, min: 0.1 },
    rate: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['Active', 'Paused'],
      default: 'Active',
      index: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

milkBandhiSchema.index({ tenantId: 1, bandhiNo: 1 }, { unique: true });
milkBandhiSchema.index({ tenantId: 1, status: 1 });

export const MilkBandhi = model<IMilkBandhi>('MilkBandhi', milkBandhiSchema);
