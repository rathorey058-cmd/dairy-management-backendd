import { Schema, model, Types } from 'mongoose';

export interface IDailyClosing {
  tenantId: Types.ObjectId;
  date: Date;
  closedBy: Types.ObjectId; // Ref User
  isClosed: boolean;
  summary: {
    milkQuantity: number;
    avgFat: number;
    avgSnf: number;
    totalSales: number;
    cashSales: number;
    creditSales: number;
    expenses: number;
    farmerPayments: number;
    expectedGalla: number;
    actualGalla: number;
    difference: number;
    expectedProfit: number;
    actualProfit: number;
  };
}

const dailyClosingSchema = new Schema<IDailyClosing>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  date: { type: Date, required: true, index: true },
  closedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isClosed: { type: Boolean, required: true, default: false },
  summary: {
    milkQuantity: { type: Number, required: true, default: 0 },
    avgFat: { type: Number, required: true, default: 0 },
    avgSnf: { type: Number, required: true, default: 0 },
    totalSales: { type: Number, required: true, default: 0 },
    cashSales: { type: Number, required: true, default: 0 },
    creditSales: { type: Number, required: true, default: 0 },
    expenses: { type: Number, required: true, default: 0 },
    farmerPayments: { type: Number, required: true, default: 0 },
    expectedGalla: { type: Number, required: true, default: 0 },
    actualGalla: { type: Number, required: true, default: 0 },
    difference: { type: Number, required: true, default: 0 },
    expectedProfit: { type: Number, required: true, default: 0 },
    actualProfit: { type: Number, required: true, default: 0 }
  }
}, { timestamps: true });

dailyClosingSchema.index({ tenantId: 1, date: 1 }, { unique: true });

export const DailyClosing = model<IDailyClosing>('DailyClosing', dailyClosingSchema);
