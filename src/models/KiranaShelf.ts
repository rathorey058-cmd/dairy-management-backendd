import { Schema, model, Types } from 'mongoose';

export interface IKiranaShelf {
  tenantId: Types.ObjectId;
  blockCode: string;          // E.g. "A1", "A2", "B1", "Shelf-01"
  shelfName: string;          // E.g. "Top Rack - Ghee & Butter"
  assignedProduct?: Types.ObjectId; // Ref Product
  productName: string;        // E.g. "Pure Desi Ghee 1L"
  category: string;           // E.g. "Ghee", "Paneer", "Grocery", "Spices"
  currentStock: number;       // Current known count of items
  capacity: number;           // Max items that fit in this block
  lowStockThreshold: number;  // Alert when below this quantity
  lastCameraCheck?: Date;
  lastDetectedCount?: number; // Count detected by AI camera
  status: 'IN_STOCK' | 'LOW_STOCK' | 'EMPTY' | 'MISPLACED';
  storageType?: 'SHELF' | 'FRIDGE_FREEZER';
  notes?: string;
}

const kiranaShelfSchema = new Schema<IKiranaShelf>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  blockCode: { type: String, required: true, uppercase: true, trim: true },
  shelfName: { type: String, required: true },
  assignedProduct: { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  category: { type: String, default: 'General' },
  currentStock: { type: Number, required: true, default: 0 },
  capacity: { type: Number, required: true, default: 20 },
  lowStockThreshold: { type: Number, required: true, default: 5 },
  lastCameraCheck: { type: Date },
  lastDetectedCount: { type: Number },
  status: { 
    type: String, 
    enum: ['IN_STOCK', 'LOW_STOCK', 'EMPTY', 'MISPLACED'], 
    default: 'IN_STOCK' 
  },
  storageType: {
    type: String,
    enum: ['SHELF', 'FRIDGE_FREEZER'],
    default: 'SHELF'
  },
  notes: { type: String }
}, { timestamps: true });

kiranaShelfSchema.index({ tenantId: 1, blockCode: 1 }, { unique: true });

export const KiranaShelf = model<IKiranaShelf>('KiranaShelf', kiranaShelfSchema);
