"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiBrainMemory = void 0;
const mongoose_1 = require("mongoose");
const aiBrainMemorySchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: {
        type: String,
        enum: ['LEARNED_OBJECT', 'LEARNED_PERSON', 'ROUTINE_BASELINE'],
        required: true,
        index: true,
    },
    label: { type: String, required: true, trim: true },
    channel: { type: Number, default: 1 },
    featureVector: { type: [Number], default: [] },
    box: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 0.2 },
        height: { type: Number, default: 0.2 },
    },
    thumbnailBase64: { type: String },
    objectCategory: { type: String, default: 'CUSTOM' },
    verifiedByOwner: { type: Boolean, default: false },
    matchCount: { type: Number, default: 1 },
    clusterCode: { type: String, index: true },
    personRole: { type: String, default: 'NEW_VISITOR' },
    isNameConfirmed: { type: Boolean, default: false },
    lockedByOwner: { type: Boolean, default: false },
    visitCount: { type: Number, default: 1 },
    visitDays: { type: [String], default: [] },
    typicalHours: { type: [Number], default: [] },
    usualItems: { type: [String], default: [] },
    candidateNames: [
        {
            name: { type: String, required: true },
            votes: { type: Number, default: 1 },
            source: { type: String, default: 'AUDIO_VOCATIVE' },
            lastHeardAt: { type: Date, default: Date.now },
        },
    ],
    lastSeenAt: { type: Date, default: Date.now },
    routineStats: {
        modelVersion: { type: Number, default: 1.0 },
        accuracyScore: { type: Number, default: 86.0 },
        totalFramesTrained: { type: Number, default: 0 },
        totalVideosTrained: { type: Number, default: 0 },
        hourlyCustomerBaseline: { type: [Number], default: () => Array(24).fill(0) },
        hourlyGallaBaseline: { type: [Number], default: () => Array(24).fill(0) },
        daysObserved: { type: Number, default: 1 },
        learnedVocabulary: { type: [String], default: [] },
        recentAnomalies: [
            {
                at: { type: Date, default: Date.now },
                severity: { type: String, default: 'WARN' },
                title: { type: String },
                detail: { type: String },
                channel: { type: Number },
            },
        ],
        lastNightlyTrainAt: { type: Date },
    },
}, { timestamps: true });
aiBrainMemorySchema.index({ tenantId: 1, kind: 1 });
exports.AiBrainMemory = (0, mongoose_1.model)('AiBrainMemory', aiBrainMemorySchema);
