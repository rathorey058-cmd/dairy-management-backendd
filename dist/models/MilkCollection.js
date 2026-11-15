"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilkCollection = void 0;
const mongoose_1 = require("mongoose");
const milkCollectionSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    farmer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    shift: { type: String, enum: ['Morning', 'Evening'], required: true },
    milkType: { type: String, enum: ['Cow', 'Buffalo', 'Mixed', 'Other'], required: true },
    quantity: { type: Number, required: true },
    fat: { type: Number, default: 0 },
    snf: { type: Number, default: 0 },
    clr: { type: Number },
    mawaYield: { type: Number },
    mawaRatePerKg: { type: Number },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
    operator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    aiVerification: {
        aiDetected: {
            weight: { type: Number },
            fat: { type: Number },
            snf: { type: Number },
            clr: { type: Number },
            confidence: { type: Number },
            rawText: { type: String }
        },
        operatorEntered: {
            weight: { type: Number },
            fat: { type: Number },
            snf: { type: Number }
        },
        isMismatched: { type: Boolean, default: false },
        mismatchReason: { type: String },
        snapshotImage: { type: String },
        verificationStatus: {
            type: String,
            enum: ['MATCHED', 'OVERRIDDEN', 'MANUAL', 'FLAGGED'],
            default: 'MANUAL'
        }
    }
}, { timestamps: true });
milkCollectionSchema.index({ tenantId: 1, date: -1 });
exports.MilkCollection = (0, mongoose_1.model)('MilkCollection', milkCollectionSchema);
