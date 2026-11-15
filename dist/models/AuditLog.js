"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: mongoose_1.Schema.Types.ObjectId },
    oldValue: { type: mongoose_1.Schema.Types.Mixed },
    newValue: { type: mongoose_1.Schema.Types.Mixed },
    ipAddress: { type: String },
    deviceInfo: { type: String }
}, { timestamps: true });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
exports.AuditLog = (0, mongoose_1.model)('AuditLog', auditLogSchema);
