"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioTranscript = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    channel: { type: Number, default: 1 },
    timestamp: { type: Date, required: true },
    durationSec: { type: Number, default: 0 },
    text: { type: String, default: '' },
    amounts: { type: [Number], default: [] },
    items: { type: [{ name: String, qty: String, _id: false }], default: [] },
    source: { type: String, enum: ['LIVE', 'DVR_HDD'], default: 'LIVE' },
    confidence: { type: Number },
});
schema.index({ tenantId: 1, timestamp: -1 });
exports.AudioTranscript = (0, mongoose_1.model)('AudioTranscript', schema);
