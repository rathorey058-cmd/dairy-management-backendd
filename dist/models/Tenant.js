"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenant = void 0;
const mongoose_1 = require("mongoose");
const microphoneDeviceSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['COUNTER', 'GALLA', 'CUSTOM'], default: 'COUNTER' },
    deviceId: { type: String },
    enabled: { type: Boolean, default: true }
}, { _id: false });
const tenantSchema = new mongoose_1.Schema({
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
    subscriptionPlan: { type: mongoose_1.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    subscriptionExpiresAt: { type: Date, required: true }
}, { timestamps: true });
exports.Tenant = (0, mongoose_1.model)('Tenant', tenantSchema);
