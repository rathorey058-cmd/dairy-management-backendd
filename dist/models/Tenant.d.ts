import { Types } from 'mongoose';
export interface IMicrophoneDevice {
    id: string;
    name: string;
    role: 'COUNTER' | 'GALLA' | 'CUSTOM';
    deviceId?: string;
    enabled: boolean;
}
export interface ITenantAiPairingConfig {
    planTier: 'FREE' | 'BASIC' | 'PAID' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
    allowedBlocksLimit: number;
    freeBlocksCount: number;
    allowedCamerasLimit?: number;
    audioTriMatchEnabled?: boolean;
    activeAddOns?: string[];
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
    subscriptionPlan: Types.ObjectId;
    subscriptionExpiresAt: Date;
}
export declare const Tenant: import("mongoose").Model<ITenant, {}, {}, {}, import("mongoose").Document<unknown, {}, ITenant, {}, import("mongoose").DefaultSchemaOptions> & ITenant & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ITenant>;
