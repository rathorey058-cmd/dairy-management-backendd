"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmerSettlement = void 0;
const mongoose_1 = require("mongoose");
const farmerSettlementSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    farmer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    milkValue: { type: Number, required: true },
    advanceAdjusted: { type: Number, required: true, default: 0 },
    alreadyPaid: { type: Number, required: true, default: 0 },
    netPayable: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
    referenceNumber: { type: String },
    notes: { type: String }
}, { timestamps: true });
exports.FarmerSettlement = (0, mongoose_1.model)('FarmerSettlement', farmerSettlementSchema);
