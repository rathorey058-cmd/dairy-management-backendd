import { Schema, model, Types } from 'mongoose';

export interface IRateRule {
  fat: number;
  snf?: number;
  rate: number;
}

export interface IMilkRateChart {
  tenantId: Types.ObjectId;
  name: string;
  effectiveDate: Date;
  pricingType: 'FAT_ONLY' | 'FAT_SNF' | 'FLAT' | 'MAWA_YIELD';
  cowRules: IRateRule[];
  buffaloRules: IRateRule[];
  mixedRules: IRateRule[];
}

const rateRuleSchema = new Schema<IRateRule>({
  fat: { type: Number, required: true },
  snf: { type: Number },
  rate: { type: Number, required: true }
}, { _id: false });

const milkRateChartSchema = new Schema<IMilkRateChart>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  effectiveDate: { type: Date, required: true, default: Date.now },
  pricingType: { type: String, enum: ['FAT_ONLY', 'FAT_SNF', 'FLAT', 'MAWA_YIELD'], required: true },
  cowRules: [rateRuleSchema],
  buffaloRules: [rateRuleSchema],
  mixedRules: [rateRuleSchema]
}, { timestamps: true });

milkRateChartSchema.index({ tenantId: 1, effectiveDate: -1 });

export const MilkRateChart = model<IMilkRateChart>('MilkRateChart', milkRateChartSchema);
