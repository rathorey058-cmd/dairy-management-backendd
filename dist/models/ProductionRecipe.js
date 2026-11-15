"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionRecipe = void 0;
const mongoose_1 = require("mongoose");
const productionRecipeSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    baselineYieldPercent: { type: Number, required: true, default: 18 },
    minExpectedYieldPercent: { type: Number, required: true, default: 15 },
    maxExpectedYieldPercent: { type: Number, required: true, default: 22 },
    fatRelationship: { type: Number, required: true, default: 0 },
    snfRelationship: { type: Number, required: true, default: 0 },
    processingCostPerUnit: { type: Number, required: true, default: 0 },
    packagingCostPerUnit: { type: Number, required: true, default: 0 },
    notes: { type: String }
}, { timestamps: true });
exports.ProductionRecipe = (0, mongoose_1.model)('ProductionRecipe', productionRecipeSchema);
