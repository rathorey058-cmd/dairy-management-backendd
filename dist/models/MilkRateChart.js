"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilkRateChart = void 0;
const mongoose_1 = require("mongoose");
const rateRuleSchema = new mongoose_1.Schema({
    fat: { type: Number, required: true },
    snf: { type: Number },
    rate: { type: Number, required: true }
}, { _id: false });
const milkRateChartSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    effectiveDate: { type: Date, required: true, default: Date.now },
    pricingType: { type: String, enum: ['FAT_ONLY', 'FAT_SNF', 'FLAT', 'MAWA_YIELD'], required: true },
    cowRules: [rateRuleSchema],
    buffaloRules: [rateRuleSchema],
    mixedRules: [rateRuleSchema]
}, { timestamps: true });
milkRateChartSchema.index({ tenantId: 1, effectiveDate: -1 });
exports.MilkRateChart = (0, mongoose_1.model)('MilkRateChart', milkRateChartSchema);
