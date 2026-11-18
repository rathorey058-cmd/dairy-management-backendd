import { Schema, model, Types } from 'mongoose';

export interface IMicrophoneDevice {
  id: string;
  name: string;
  role: 'COUNTER' | 'GALLA' | 'CUSTOM';
  deviceId?: string;
  enabled: boolean;
}

export interface ITenantAiPairingConfig {
  planTier: 'FREE' | 'PAID' | 'CUSTOM';
  allowedBlocksLimit: number; // e.g. 15 for Free, 60+ for Paid
  freeBlocksCount: number;    // Default 15
  isPaidPlanActive: boolean;
}

export interface ITenantPricingConfig {
  cowBaseRatePerFat: number;
  cowBaseRatePerSnf: number;
  cowSellingPrice: number;
  buffaloBaseRatePerFat: number;
  buffaloBaseRatePerSnf: number;
  buffaloSellingPrice: number;
}

export interface ITenantSettlementCycle {
  cycleType: '10_DAY' | 'WEEKLY' | '15_DAY' | 'MONTHLY' | 'CUSTOM';
  customDays?: number;
}

export interface ITenantHardwareConfig {
  cameraRtspUrl?: string;
  nvrIpAddress?: string;
  cameraLocation?: string;
  audioMode: 'VISION_AUDIO' | 'VISION_ONLY';
  microphones: IMicrophoneDevice[];
}

export interface ITenant {
  name: string;
  logoUrl?: string;
  ownerName: string;
  mobile: string;
  whatsappNumber?: string;
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
  pricingConfig: ITenantPricingConfig;
  settlementCycle: ITenantSettlementCycle;
  hardwareConfig: ITenantHardwareConfig;
  isOnboardingCompleted: boolean;
  status: 'Active' | 'Trial' | 'Suspended';
  geminiApiKey?: string;
  aiPairingConfig?: ITenantAiPairingConfig;
  subscriptionPlan: Types.ObjectId; // Ref SubscriptionPlan
  subscriptionExpiresAt: Date;
}

const microphoneDeviceSchema = new Schema<IMicrophoneDevice>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['COUNTER', 'GALLA', 'CUSTOM'], default: 'COUNTER' },
  deviceId: { type: String },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  logoUrl: { type: String },
  ownerName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  whatsappNumber: { type: String },
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
  pricingConfig: {
    cowBaseRatePerFat: { type: Number, default: 7.5 },
    cowBaseRatePerSnf: { type: Number, default: 4.0 },
    cowSellingPrice: { type: Number, default: 60.0 },
    buffaloBaseRatePerFat: { type: Number, default: 9.0 },
    buffaloBaseRatePerSnf: { type: Number, default: 4.5 },
    buffaloSellingPrice: { type: Number, default: 80.0 }
  },
  settlementCycle: {
    cycleType: { 
      type: String, 
      enum: ['10_DAY', 'WEEKLY', '15_DAY', 'MONTHLY', 'CUSTOM'], 
      default: '10_DAY' 
    },
    customDays: { type: Number, default: 10 }
  },
  hardwareConfig: {
    cameraRtspUrl: { type: String, default: '' },
    nvrIpAddress: { type: String, default: '192.168.31.129' },
    cameraLocation: { type: String, default: 'Counter & Galla' },
    audioMode: { type: String, enum: ['VISION_AUDIO', 'VISION_ONLY'], default: 'VISION_AUDIO' },
    microphones: { 
      type: [microphoneDeviceSchema], 
      default: [
        { id: 'mic-1', name: 'Counter Mic (काउंटर माइक)', role: 'COUNTER', enabled: true },
        { id: 'mic-2', name: 'Cash Drawer Mic (गल्ला माइक)', role: 'GALLA', enabled: true }
      ] 
    }
  },
  isOnboardingCompleted: { type: Boolean, default: false },
  geminiApiKey: { type: String },
  aiPairingConfig: {
    planTier: { type: String, enum: ['FREE', 'PAID', 'CUSTOM'], default: 'FREE' },
    allowedBlocksLimit: { type: Number, default: 15 },
    freeBlocksCount: { type: Number, default: 15 },
    isPaidPlanActive: { type: Boolean, default: false }
  },
  status: { type: String, enum: ['Active', 'Trial', 'Suspended'], default: 'Trial' },
  subscriptionPlan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  subscriptionExpiresAt: { type: Date, required: true }
}, { timestamps: true });

export const Tenant = model<ITenant>('Tenant', tenantSchema);
