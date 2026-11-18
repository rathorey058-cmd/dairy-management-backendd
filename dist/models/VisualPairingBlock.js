"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualPairingBlock = void 0;
const mongoose_1 = require("mongoose");
const visualPairingBlockSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    blockCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['GALLA', 'REUSABLE_CAN', 'SHELF', 'GATE_TRIPWIRE', 'MACHINERY', 'CUSTOM'],
        default: 'CUSTOM',
        required: true
    },
    color: { type: String, default: '#3B82F6' },
    barcode: { type: String, trim: true, index: true },
    cameraChannel: { type: Number, required: true, default: 1 },
    coordinates: {
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 },
        width: { type: Number, default: 20 },
        height: { type: Number, default: 20 }
    },
    tripwireConfig: {
        type: { type: String, enum: ['BI_DIRECTIONAL', 'OUT_ONLY', 'IN_ONLY'], default: 'BI_DIRECTIONAL' },
        lineInY: { type: Number, default: 40 },
        lineOutY: { type: Number, default: 60 },
        alertOnMissingAtEOD: { type: Boolean, default: true }
    },
    shelfConfig: {
        pickCount: { type: Number, default: 0 },
        capacity: { type: Number, default: 50 },
        lastPickAt: { type: Date }
    },
    gateStatus: {
        status: { type: String, enum: ['INSIDE_SHOP', 'OUTSIDE_SHOP', 'IN_TRANSIT'], default: 'INSIDE_SHOP' },
        lastExitTime: { type: Date },
        lastReturnTime: { type: Date },
        exitCountToday: { type: Number, default: 0 },
        returnCountToday: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'DISPLACED', 'OUT_OF_SHOP', 'MISSING'],
        default: 'ACTIVE'
    },
    totalPicks: { type: Number, default: 0 },
    lastDetectedAt: { type: Date },
    notes: { type: String }
}, { timestamps: true });
visualPairingBlockSchema.index({ tenantId: 1, blockCode: 1 }, { unique: true });
visualPairingBlockSchema.index({ tenantId: 1, cameraChannel: 1 });
exports.VisualPairingBlock = (0, mongoose_1.model)('VisualPairingBlock', visualPairingBlockSchema);
