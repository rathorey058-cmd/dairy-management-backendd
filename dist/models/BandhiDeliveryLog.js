"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BandhiDeliveryLog = void 0;
const mongoose_1 = require("mongoose");
const deliveryItemSchema = new mongoose_1.Schema({
    bandhi: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MilkBandhi', required: true },
    bandhiNo: { type: Number, required: true },
    customerName: { type: String, required: true },
    customer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' },
    milkType: { type: String, enum: ['Buffalo', 'Cow', 'Mixed'], default: 'Buffalo' },
    standardQuantity: { type: Number, required: true },
    deliveredQuantity: { type: Number, required: true, default: 0 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true, default: 0 },
    status: {
        type: String,
        enum: ['DELIVERED', 'SKIPPED', 'EXTRA'],
        default: 'DELIVERED',
    },
    notes: { type: String, default: '' },
}, { _id: false });
const bandhiDeliveryLogSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, index: true },
    shift: { type: String, enum: ['Morning', 'Evening'], required: true },
    deliveries: [deliveryItemSchema],
    totalMilkDelivered: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    deliveredCount: { type: Number, required: true, default: 0 },
    skippedCount: { type: Number, required: true, default: 0 },
    isConfirmed: { type: Boolean, default: true },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
bandhiDeliveryLogSchema.index({ tenantId: 1, date: 1, shift: 1 }, { unique: true });
exports.BandhiDeliveryLog = (0, mongoose_1.model)('BandhiDeliveryLog', bandhiDeliveryLogSchema);
