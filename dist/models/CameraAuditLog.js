"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraAuditLog = void 0;
const mongoose_1 = require("mongoose");
const ultraCrispIncidentSchema = new mongoose_1.Schema({
    timeCode: { type: String, required: true },
    alertType: { type: String, required: true },
    amountOrItem: { type: String, required: true },
    rootCause: { type: String, required: true },
    confidence: { type: Number, default: 95 },
    videoClipUrl: { type: String },
    audioVerified: { type: Boolean, default: false },
    micChannel: { type: String, default: 'Counter Mic' },
    status: { type: String, enum: ['PENDING_REVIEW', 'FLAGGED_THEFT', 'CLEARED_SAFE'], default: 'PENDING_REVIEW' }
}, { _id: false });
const cameraAuditLogSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    camera: { type: mongoose_1.Schema.Types.ObjectId, ref: 'CameraDevice' },
    eventType: {
        type: String,
        enum: [
            'MILK_OCR_AUDIT', 'FACE_VISIT', 'GALLA_ALERT', 'SHELF_SCAN', 'FRIDGE_ACCESS',
            'CURRENCY_DETECT', 'SECURITY_EVENT', 'CASH_DRAWER_MISMATCH', 'DELTA_COIN_MISMATCH',
            'HAND_TO_POCKET', 'HAND_TO_MOUTH', 'COUNTER_CROSSING', 'MULTI_MIC_ALERT'
        ],
        required: true,
        index: true
    },
    timestamp: { type: Date, default: Date.now, index: true },
    farmer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Farmer' },
    personName: { type: String },
    farmerIdCode: { type: String },
    visitCountToday: { type: Number, default: 1 },
    aiReading: {
        weight: { type: Number },
        fat: { type: Number },
        snf: { type: Number },
        clr: { type: Number },
        confidence: { type: Number },
        rawText: { type: String }
    },
    operatorReading: {
        weight: { type: Number },
        fat: { type: Number },
        snf: { type: Number }
    },
    isMismatched: { type: Boolean, default: false, index: true },
    mismatchReason: { type: String },
    weightVariance: { type: Number },
    fatVariance: { type: Number },
    shelfBlock: { type: String },
    detectedCount: { type: Number },
    currencyDetails: {
        notesDetected: [{
                note: { type: String },
                count: { type: Number }
            }],
        totalEstimatedCash: { type: Number },
        drawerStatus: { type: String, enum: ['OPENED', 'CLOSED', 'TAMPERED'], default: 'CLOSED' },
        activeBillAmount: { type: Number, default: 0 },
        coinsDeltaCalculated: { type: Number, default: 0 }
    },
    fridgeDetails: {
        action: { type: String, enum: ['DOOR_OPEN', 'ITEM_REMOVED', 'ITEM_ADDED', 'DOOR_CLOSE'] },
        itemsAffected: [{ type: String }],
        isNightAlert: { type: Boolean, default: false }
    },
    incident: ultraCrispIncidentSchema,
    snapshotImage: { type: String },
    videoClipUrl: { type: String },
    audioClipUrl: { type: String },
    videoZone: { type: String },
    aiAnalysis: {
        audioQuote: { type: String },
        requestedItem: { type: String },
        givenItem: { type: String },
        amountPaid: { type: Number },
        cashHandedOver: { type: Boolean },
        analystSummary: { type: String },
        model: { type: String },
        analyzedAt: { type: Date }
    },
    status: {
        type: String,
        enum: ['VERIFIED', 'MISMATCH', 'RESOLVED', 'INFO'],
        default: 'INFO',
        index: true
    },
    operatorUser: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
}, { timestamps: true });
cameraAuditLogSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });
cameraAuditLogSchema.index({ tenantId: 1, personName: 1, timestamp: -1 });
exports.CameraAuditLog = (0, mongoose_1.model)('CameraAuditLog', cameraAuditLogSchema);
