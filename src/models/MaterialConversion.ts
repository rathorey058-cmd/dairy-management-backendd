import { Schema, model, Types, Document } from 'mongoose';

export interface IMaterialConversion extends Document {
  tenantId: Types.ObjectId;
  conversionType: 'CREAM_TO_GHEE' | 'MILK_TO_PANEER' | 'MILK_TO_LASSI' | 'MILK_TO_CURD' | 'MILK_TO_CREAM' | 'MILK_TO_KHOYA' | 'CUSTOM';
  date: Date;
  inputMaterial: string; // e.g. "Cream (मलाई)", "Milk (दूध)"
  inputQuantity: number;
  inputUnit: string; // "KG" | "Litre"
  outputProduct: string; // e.g. "Desi Ghee (देसी घी)", "Paneer (पनीर)", "Lassi (लस्सी)"
  outputQuantity: number;
  outputUnit: string; // "KG" | "Litre"
  yieldPercent: number; // e.g. 80% (40kg Ghee / 50kg Cream)
  byProduct?: {
    name: string;
    quantity: number;
    unit: string;
  };
  notes?: string;
  operator?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialConversionSchema = new Schema<IMaterialConversion>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  conversionType: { 
    type: String, 
    enum: ['CREAM_TO_GHEE', 'MILK_TO_PANEER', 'MILK_TO_LASSI', 'MILK_TO_CURD', 'MILK_TO_CREAM', 'MILK_TO_KHOYA', 'CUSTOM'],
    required: true 
  },
  date: { type: Date, required: true, default: Date.now, index: true },
  inputMaterial: { type: String, required: true },
  inputQuantity: { type: Number, required: true },
  inputUnit: { type: String, required: true, default: 'KG' },
  outputProduct: { type: String, required: true },
  outputQuantity: { type: Number, required: true },
  outputUnit: { type: String, required: true, default: 'KG' },
  yieldPercent: { type: Number, required: true },
  byProduct: {
    name: { type: String },
    quantity: { type: Number },
    unit: { type: String }
  },
  notes: { type: String },
  operator: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

materialConversionSchema.index({ tenantId: 1, date: -1 });

export const MaterialConversion = model<IMaterialConversion>('MaterialConversion', materialConversionSchema);
