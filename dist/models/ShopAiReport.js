"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopAiReport = void 0;
const mongoose_1 = require("mongoose");
const shopAiReportSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    sourceType: {
        type: String,
        enum: ['VIDEO_UPLOAD', 'LIVE_STREAM_AUDIT', 'AUDIO_RECORDING', 'SNAPSHOT_AUDIT'],
        default: 'VIDEO_UPLOAD',
        index: true,
    },
    mediaType: { type: String, enum: ['video', 'audio', 'image'], default: 'video' },
    mediaThumbnail: { type: String },
    mediaDuration: { type: String },
    userContextPrompt: { type: String },
    cameraName: { type: String, default: 'Shop Counter AI Cam' },
    status: {
        type: String,
        enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'COMPLETED',
        index: true,
    },
    customerCount: {
        total: { type: Number, default: 0 },
        men: { type: Number, default: 0 },
        women: { type: Number, default: 0 },
        children: { type: Number, default: 0 },
        notes: { type: String, default: '' },
    },
    staffPerformance: {
        staffIdentified: [{ type: String }],
        attendanceStatus: { type: String, default: 'उपस्थित' },
        activeScore: { type: Number, default: 100 },
        behaviorNotes: { type: String, default: '' },
        unattendedLapses: [{ type: String }],
    },
    voiceAnalysis: {
        languageDetected: { type: String, default: 'Hindi / Mixed' },
        audioSummary: { type: String, default: '' },
        transcripts: [
            {
                speaker: { type: String },
                timeCode: { type: String },
                text: { type: String },
                intent: { type: String },
            },
        ],
    },
    businessTransactions: {
        estimatedTransactionsCount: { type: Number, default: 0 },
        itemsDiscussedOrSold: [{ type: String }],
        cashCounterObservations: { type: String, default: '' },
    },
    aiBrainInsights: {
        positives: [{ type: String }],
        concernsOrAlerts: [{ type: String }],
        actionableSuggestions: [{ type: String }],
        anomalyDetected: { type: Boolean, default: false },
    },
    writtenFullReport: { type: String, required: true },
    rawSummary: { type: String, default: '' },
}, { timestamps: true });
shopAiReportSchema.index({ tenantId: 1, createdAt: -1 });
shopAiReportSchema.index({ tenantId: 1, sourceType: 1, createdAt: -1 });
exports.ShopAiReport = (0, mongoose_1.model)('ShopAiReport', shopAiReportSchema);
