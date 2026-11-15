"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Customer = void 0;
const mongoose_1 = require("mongoose");
const customerSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsappNumber: { type: String },
    address: { type: String },
    area: { type: String },
    creditLimit: { type: Number, required: true, default: 0 },
    outstandingBalance: { type: Number, required: true, default: 0 }
}, { timestamps: true });
customerSchema.index({ tenantId: 1, mobile: 1 }, { unique: true });
exports.Customer = (0, mongoose_1.model)('Customer', customerSchema);
