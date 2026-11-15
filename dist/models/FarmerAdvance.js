"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmerAdvance = void 0;
const mongoose_1 = require("mongoose");
const farmerAdvanceSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    farmer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
    referenceNumber: { type: String },
    remainingAdvance: { type: Number, required: true },
    notes: { type: String }
}, { timestamps: true });
exports.FarmerAdvance = (0, mongoose_1.model)('FarmerAdvance', farmerAdvanceSchema);
