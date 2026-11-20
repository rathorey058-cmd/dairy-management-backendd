"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecorderHeartbeat = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    minute: { type: Number, required: true },
    at: { type: Date, default: Date.now },
});
schema.index({ tenantId: 1, minute: 1 }, { unique: true });
// auto-clean after 90 days
schema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
exports.RecorderHeartbeat = (0, mongoose_1.model)('RecorderHeartbeat', schema);
