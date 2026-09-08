import { Schema, model, Types } from 'mongoose';

export interface ITenant {
  name: string;
  logoUrl?: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  gstNumber?: string;
  pan?: string;
  invoicePrefix: string;
  financialYear: string;
  businessHours?: string;
  defaultCurrency: string;
  taxSettings?: {
    enabled: boolean;
    defaultGstPercent: number;
  };
  status: 'Active' | 'Trial' | 'Suspended';
  geminiApiKey?: string;
  subscriptionPlan: Types.ObjectId; // Ref SubscriptionPlan
  subscriptionExpiresAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  logoUrl: { type: String },
  ownerName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  gstNumber: { type: String },
  pan: { type: String },
  invoicePrefix: { type: String, required: true, default: 'DS' },
  financialYear: { type: String, required: true, default: '2026-27' },
  businessHours: { type: String },
  defaultCurrency: { type: String, required: true, default: 'INR' },
  taxSettings: {
    enabled: { type: Boolean, default: false },
    defaultGstPercent: { type: Number, default: 0 }
  },
  geminiApiKey: { type: String },
  status: { type: String, enum: ['Active', 'Trial', 'Suspended'], default: 'Trial' },
  subscriptionPlan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  subscriptionExpiresAt: { type: Date, required: true }
}, { timestamps: true });

export const Tenant = model<ITenant>('Tenant', tenantSchema);
