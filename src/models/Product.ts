import { Schema, model, Types } from 'mongoose';

export interface IProduct {
  tenantId: Types.ObjectId;
  name: string;
  unit: 'KG' | 'Litre' | 'Packet' | 'Piece' | 'Bottle' | 'Gram';
  sellingPrice: number;
  costPrice: number; // dynamically computed or manual baseline
  stockQty: number;
  category: 'Milk' | 'Paneer' | 'Curd' | 'Ghee' | 'Butter' | 'Cream' | 'Khoya' | 'Other';
  barcode?: string;
  status: 'Active' | 'Inactive';
}

const productSchema = new Schema<IProduct>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  unit: { type: String, enum: ['KG', 'Litre', 'Packet', 'Piece', 'Bottle', 'Gram'], required: true },
  sellingPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true, default: 0 },
  stockQty: { type: Number, required: true, default: 0 },
  category: { 
    type: String, 
    enum: ['Milk', 'Paneer', 'Curd', 'Ghee', 'Butter', 'Cream', 'Khoya', 'Other'], 
    required: true 
  },
  barcode: { type: String, trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

productSchema.index({ tenantId: 1, name: 1 }, { unique: true });
productSchema.index({ tenantId: 1, barcode: 1 });

export const Product = model<IProduct>('Product', productSchema);
