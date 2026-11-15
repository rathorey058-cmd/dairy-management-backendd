"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopPersonProfile = void 0;
const mongoose_1 = require("mongoose");
const shopPersonProfileSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: {
        type: String,
        enum: ['OWNER', 'STAFF', 'HELPER', 'CASHIER'],
        default: 'STAFF'
    },
    mobile: { type: String, trim: true },
    photoBase64: { type: String },
    dutyTiming: {
        start: { type: String, default: '06:00' },
        end: { type: String, default: '20:00' },
    },
    customInstructions: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    notes: { type: String, default: '' },
    lastSeenAt: { type: Date },
}, { timestamps: true });
shopPersonProfileSchema.index({ tenantId: 1, status: 1 });
exports.ShopPersonProfile = (0, mongoose_1.model)('ShopPersonProfile', shopPersonProfileSchema);
