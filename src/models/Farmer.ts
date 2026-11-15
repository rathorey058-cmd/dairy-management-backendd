import { Schema, model, Types } from 'mongoose';

export interface IFarmer {
  tenantId: Types.ObjectId;
  farmerId: string; // E.g., F-0001
  name: string;
  mobile: string;
  village: string;
  address?: string;
  bankAccount?: string;
  ifsc?: string;
  upi?: string;
  joiningDate: Date;
  status: 'Active' | 'Inactive';
  openingBalance: number; // positive payable, negative receivable
  openingAdvance: number;
  fatRate?: number; // Custom FAT rate (e.g. ₹10 per FAT)
  tokenNumber?: string; // e.g. "01", "12", "T-10"
  tokenBarcode?: string; // QR / Barcode string
  photoUrl?: string; // Profile picture for face detection
  notes?: string;
  dpdpConsentGiven?: boolean;
  dpdpConsentDate?: Date;
  dpdpConsentChannel?: string;
}

const farmerSchema = new Schema<IFarmer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  farmerId: { type: String, required: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  village: { type: String, required: true },
  address: { type: String },
  bankAccount: { type: String },
  ifsc: { type: String },
  upi: { type: String },
  joiningDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  openingBalance: { type: Number, required: true, default: 0 },
  openingAdvance: { type: Number, required: true, default: 0 },
  fatRate: { type: Number, default: 0 },
  tokenNumber: { type: String, trim: true },
  tokenBarcode: { type: String, trim: true },
  photoUrl: { type: String },
  notes: { type: String },
  dpdpConsentGiven: { type: Boolean, default: true },
  dpdpConsentDate: { type: Date, default: Date.now },
  dpdpConsentChannel: { type: String, default: 'WHATSAPP_SMS_PHYSICAL' }
}, { timestamps: true });

farmerSchema.index({ tenantId: 1, tokenNumber: 1 });
farmerSchema.index({ tenantId: 1, tokenBarcode: 1 });

farmerSchema.index({ tenantId: 1, farmerId: 1 }, { unique: true });

export const Farmer = model<IFarmer>('Farmer', farmerSchema);
