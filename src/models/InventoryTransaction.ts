import { Schema, model, Types } from 'mongoose';

export interface IInventoryTransaction {
  tenantId: Types.ObjectId;
  product: Types.ObjectId; // Ref Product or special Raw Milk tracker
  isRawMilk: boolean; // True if it's the raw milk pool, False if finished product
  type: 'Opening' | 'Purchase' | 'Production_In' | 'Production_Out' | 'Sales' | 'Wastage' | 'Adjustment';
  quantity: number; // positive for additions, negative for reductions
  date: Date;
  referenceId?: Types.ObjectId; // Ref to MilkCollection, ProductionBatch, Order, etc.
  notes?: string;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
  isRawMilk: { type: Boolean, default: false },
  type: { 
    type: String, 
    enum: ['Opening', 'Purchase', 'Production_In', 'Production_Out', 'Sales', 'Wastage', 'Adjustment'], 
    required: true 
  },
  quantity: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  referenceId: { type: Schema.Types.ObjectId },
  notes: { type: String }
}, { timestamps: true });

inventoryTransactionSchema.index({ tenantId: 1, date: -1 });

export const InventoryTransaction = model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
