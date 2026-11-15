"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilkBandhi = void 0;
const mongoose_1 = require("mongoose");
const milkBandhiSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bandhiNo: { type: Number, required: true },
    customerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    milkType: {
        type: String,
        enum: ['Buffalo', 'Cow', 'Mixed'],
        default: 'Buffalo',
    },
    shift: {
        type: String,
        enum: ['Morning', 'Evening', 'Both'],
        default: 'Morning',
    },
    dailyQuantity: { type: Number, required: true, min: 0.1 },
    rate: { type: Number, required: true, min: 1 },
    status: {
        type: String,
        enum: ['Active', 'Paused'],
        default: 'Active',
        index: true,
    },
    customer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' },
    notes: { type: String, default: '' },
}, { timestamps: true });
milkBandhiSchema.index({ tenantId: 1, bandhiNo: 1 }, { unique: true });
milkBandhiSchema.index({ tenantId: 1, status: 1 });
exports.MilkBandhi = (0, mongoose_1.model)('MilkBandhi', milkBandhiSchema);
