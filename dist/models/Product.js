"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = require("mongoose");
const productSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    unit: { type: String, enum: ['KG', 'Litre', 'Packet', 'Piece', 'Bottle', 'Gram'], required: true },
    sellingPrice: { type: Number, required: true },
    costPrice: { type: Number, required: true, default: 0 },
    stockQty: { type: Number, required: true, default: 0 },
    category: {
        type: String,
        enum: ['Milk', 'Paneer', 'Curd', 'Ghee', 'Butter', 'Cream', 'Khoya', 'Other'],
        required: true
    },
    barcode: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });
productSchema.index({ tenantId: 1, name: 1 }, { unique: true });
productSchema.index({ tenantId: 1, barcode: 1 });
exports.Product = (0, mongoose_1.model)('Product', productSchema);
