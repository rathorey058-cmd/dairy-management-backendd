import { Schema, model, Types, Document } from 'mongoose';

export interface IShopPersonProfile extends Document {
  tenantId: Types.ObjectId;
  name: string;
  role: 'OWNER' | 'STAFF' | 'HELPER' | 'CASHIER';
  mobile?: string;
  photoBase64?: string; // Full clear face photo for AI recognition
  dutyTiming?: {
    start: string; // E.g. "06:00"
    end: string;   // E.g. "14:00"
  };
  customInstructions?: string; // E.g. "काउंटर छोड़कर नहीं जाना, गल्ला बिना मालिक के नहीं खोलना"
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shopPersonProfileSchema = new Schema<IShopPersonProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { 
      type: String, 
      enum: ['OWNER', 'STAFF', 'HELPER', 'CASHIER'], 
      default: 'STAFF' 
    },
    mobile: { type: String, trim: true },
    photoBase64: { type: String },
    dutyTiming: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '20:00' },
    },
    customInstructions: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    notes: { type: String, default: '' },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

shopPersonProfileSchema.index({ tenantId: 1, status: 1 });

export const ShopPersonProfile = model<IShopPersonProfile>('ShopPersonProfile', shopPersonProfileSchema);
