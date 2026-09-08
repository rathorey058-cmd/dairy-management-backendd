import { Schema, model, Types } from 'mongoose';

export interface IProductionBatch {
  tenantId: Types.ObjectId;
  batchNumber: string; // unique batch identifier
  date: Date;
  product: Types.ObjectId; // Ref Product
  milkQuantityUsed: number;
  avgFat: number;
  avgSnf: number;
  expectedOutput: number; // expected quantity in KG/Litre
  actualOutput?: number; // actual quantity produced
  variance?: number; // actual - expected
  yieldPercent?: number; // (actual / milkQuantityUsed) * 100
  processingCost: number;
  packagingCost: number;
  otherCost: number;
  totalBatchCost: number; // raw milk cost + processing + packaging + other
  costPerUnit?: number; // totalBatchCost / actualOutput
  operator: Types.ObjectId; // Ref User
  status: 'InProgress' | 'Completed' | 'Cancelled';
  notes?: string;
}

const productionBatchSchema = new Schema<IProductionBatch>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  batchNumber: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  milkQuantityUsed: { type: Number, required: true },
  avgFat: { type: Number, required: true },
  avgSnf: { type: Number, required: true },
  expectedOutput: { type: Number, required: true },
  actualOutput: { type: Number },
  variance: { type: Number },
  yieldPercent: { type: Number },
  processingCost: { type: Number, required: true, default: 0 },
  packagingCost: { type: Number, required: true, default: 0 },
  otherCost: { type: Number, required: true, default: 0 },
  totalBatchCost: { type: Number, required: true },
  costPerUnit: { type: Number },
  operator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['InProgress', 'Completed', 'Cancelled'], default: 'InProgress' },
  notes: { type: String }
}, { timestamps: true });

productionBatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true });
productionBatchSchema.index({ tenantId: 1, date: -1 });

export const ProductionBatch = model<IProductionBatch>('ProductionBatch', productionBatchSchema);
