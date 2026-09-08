import { Schema, model, Types } from 'mongoose';

export interface IProductionRecipe {
  tenantId: Types.ObjectId;
  product: Types.ObjectId; // Ref Product
  baselineYieldPercent: number; // e.g. 18% for Paneer (100L milk -> 18KG paneer)
  minExpectedYieldPercent: number;
  maxExpectedYieldPercent: number;
  fatRelationship: number; // modifier per 1% fat, e.g. +3% yield per fat point above 4.0
  snfRelationship: number; // modifier per 1% snf, e.g. +2% yield per snf point above 8.5
  processingCostPerUnit: number; // processing cost per unit of output
  packagingCostPerUnit: number; // packaging cost per unit of output
  notes?: string;
}

const productionRecipeSchema = new Schema<IProductionRecipe>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  baselineYieldPercent: { type: Number, required: true, default: 18 },
  minExpectedYieldPercent: { type: Number, required: true, default: 15 },
  maxExpectedYieldPercent: { type: Number, required: true, default: 22 },
  fatRelationship: { type: Number, required: true, default: 0 },
  snfRelationship: { type: Number, required: true, default: 0 },
  processingCostPerUnit: { type: Number, required: true, default: 0 },
  packagingCostPerUnit: { type: Number, required: true, default: 0 },
  notes: { type: String }
}, { timestamps: true });

export const ProductionRecipe = model<IProductionRecipe>('ProductionRecipe', productionRecipeSchema);
