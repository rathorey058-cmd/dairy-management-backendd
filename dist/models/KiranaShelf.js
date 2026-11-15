"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KiranaShelf = void 0;
const mongoose_1 = require("mongoose");
const kiranaShelfSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    blockCode: { type: String, required: true, uppercase: true, trim: true },
    shelfName: { type: String, required: true },
    assignedProduct: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    category: { type: String, default: 'General' },
    currentStock: { type: Number, required: true, default: 0 },
    capacity: { type: Number, required: true, default: 20 },
    lowStockThreshold: { type: Number, required: true, default: 5 },
    lastCameraCheck: { type: Date },
    lastDetectedCount: { type: Number },
    status: {
        type: String,
        enum: ['IN_STOCK', 'LOW_STOCK', 'EMPTY', 'MISPLACED'],
        default: 'IN_STOCK'
    },
    storageType: {
        type: String,
        enum: ['SHELF', 'FRIDGE_FREEZER'],
        default: 'SHELF'
    },
    notes: { type: String }
}, { timestamps: true });
kiranaShelfSchema.index({ tenantId: 1, blockCode: 1 }, { unique: true });
exports.KiranaShelf = (0, mongoose_1.model)('KiranaShelf', kiranaShelfSchema);
