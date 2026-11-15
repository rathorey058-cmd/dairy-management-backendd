"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialConversion = void 0;
const mongoose_1 = require("mongoose");
const materialConversionSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    conversionType: {
        type: String,
        enum: ['CREAM_TO_GHEE', 'MILK_TO_PANEER', 'MILK_TO_LASSI', 'MILK_TO_CURD', 'MILK_TO_CREAM', 'MILK_TO_KHOYA', 'CUSTOM'],
        required: true
    },
    date: { type: Date, required: true, default: Date.now, index: true },
    inputMaterial: { type: String, required: true },
    inputQuantity: { type: Number, required: true },
    inputUnit: { type: String, required: true, default: 'KG' },
    outputProduct: { type: String, required: true },
    outputQuantity: { type: Number, required: true },
    outputUnit: { type: String, required: true, default: 'KG' },
    yieldPercent: { type: Number, required: true },
    byProduct: {
        name: { type: String },
        quantity: { type: Number },
        unit: { type: String }
    },
    notes: { type: String },
    operator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
materialConversionSchema.index({ tenantId: 1, date: -1 });
exports.MaterialConversion = (0, mongoose_1.model)('MaterialConversion', materialConversionSchema);
