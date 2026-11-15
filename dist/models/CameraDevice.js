"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraDevice = void 0;
const mongoose_1 = require("mongoose");
const cameraDeviceSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    deviceType: {
        type: String,
        enum: ['DVR', 'NVR', 'IP_CAMERA'],
        default: 'DVR',
        index: true
    },
    brand: {
        type: String,
        enum: ['HIKVISION', 'CP_PLUS', 'DAHUA', 'GENERIC_ONVIF'],
        default: 'HIKVISION'
    },
    channelType: {
        type: String,
        enum: ['ANALOG', 'IP'],
        default: 'ANALOG'
    },
    locationType: {
        type: String,
        enum: ['COUNTER_OCR', 'GALLA_SECURITY', 'SHELF_INVENTORY', 'GATE_ENTRY', 'CATTLE_SHED'],
        default: 'COUNTER_OCR',
        required: true
    },
    ipAddress: { type: String, required: true },
    port: { type: Number, default: 80 },
    rtspPort: { type: Number, default: 554 },
    username: { type: String, default: 'admin' },
    password: { type: String, default: '' },
    channel: { type: Number, default: 1 },
    streamType: { type: String, enum: ['main', 'sub'], default: 'sub' },
    snapshotUrl: { type: String },
    rtspUrl: { type: String },
    hikConnectSerial: { type: String },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'UNKNOWN'], default: 'UNKNOWN' },
    lastChecked: { type: Date },
    notes: { type: String }
}, { timestamps: true });
cameraDeviceSchema.index({ tenantId: 1, locationType: 1 });
exports.CameraDevice = (0, mongoose_1.model)('CameraDevice', cameraDeviceSchema);
