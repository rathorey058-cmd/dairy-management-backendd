"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionBatch = void 0;
const mongoose_1 = require("mongoose");
const productionBatchSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    batchNumber: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    milkQuantityUsed: { type: Number, required: true },
    avgFat: { type: Number, required: true },
    avgSnf: { type: Number, required: true },
    expectedOutput: { type: Number, required: true },
    actualOutput: { type: Number },
    variance: { type: Number },
    yieldPercent: { type: Number },
    processingCost: { type: Number, required: true, default: 0 },
    packagingCost: { type: Number, required: true, default: 0 },
    otherCost: { type: Number, required: true, default: 0 },
    totalBatchCost: { type: Number, required: true },
    costPerUnit: { type: Number },
    operator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['InProgress', 'Completed', 'Cancelled'], default: 'InProgress' },
    notes: { type: String }
}, { timestamps: true });
productionBatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true });
productionBatchSchema.index({ tenantId: 1, date: -1 });
exports.ProductionBatch = (0, mongoose_1.model)('ProductionBatch', productionBatchSchema);
