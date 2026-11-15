import { Schema, model, Types } from 'mongoose';

export interface IMilkCollection {
  tenantId: Types.ObjectId;
  farmer: Types.ObjectId; // Ref Farmer
  date: Date;
  shift: 'Morning' | 'Evening';
  milkType: 'Cow' | 'Buffalo' | 'Mixed' | 'Other';
  quantity: number;
  fat?: number;
  snf?: number;
  clr?: number; // Lactometer reading
  mawaYield?: number; // Yield % (e.g. 18%)
  mawaRatePerKg?: number; // Price per KG Mawa
  rate: number;
  amount: number;
  operator: Types.ObjectId; // Ref User
  notes?: string;
  aiVerification?: {
    aiDetected?: {
      weight?: number;
      fat?: number;
      snf?: number;
      clr?: number;
      confidence?: number;
      rawText?: string;
    };
    operatorEntered?: {
      weight?: number;
      fat?: number;
      snf?: number;
    };
    isMismatched?: boolean;
    mismatchReason?: string;
    snapshotImage?: string;
    verificationStatus?: 'MATCHED' | 'OVERRIDDEN' | 'MANUAL' | 'FLAGGED';
  };
}

const milkCollectionSchema = new Schema<IMilkCollection>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  shift: { type: String, enum: ['Morning', 'Evening'], required: true },
  milkType: { type: String, enum: ['Cow', 'Buffalo', 'Mixed', 'Other'], required: true },
  quantity: { type: Number, required: true },
  fat: { type: Number, default: 0 },
  snf: { type: Number, default: 0 },
  clr: { type: Number },
  mawaYield: { type: Number },
  mawaRatePerKg: { type: Number },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  operator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  aiVerification: {
    aiDetected: {
      weight: { type: Number },
      fat: { type: Number },
      snf: { type: Number },
      clr: { type: Number },
      confidence: { type: Number },
      rawText: { type: String }
    },
    operatorEntered: {
      weight: { type: Number },
      fat: { type: Number },
      snf: { type: Number }
    },
    isMismatched: { type: Boolean, default: false },
    mismatchReason: { type: String },
    snapshotImage: { type: String },
    verificationStatus: { 
      type: String, 
      enum: ['MATCHED', 'OVERRIDDEN', 'MANUAL', 'FLAGGED'], 
      default: 'MANUAL' 
    }
  }
}, { timestamps: true });

milkCollectionSchema.index({ tenantId: 1, date: -1 });

export const MilkCollection = model<IMilkCollection>('MilkCollection', milkCollectionSchema);
