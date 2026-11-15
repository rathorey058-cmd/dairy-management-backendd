"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmerLedger = void 0;
const mongoose_1 = require("mongoose");
const farmerLedgerSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    farmer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true },
    transactionType: {
        type: String,
        enum: ['MILK_SUPPLY', 'ADVANCE_GIVEN', 'PAYMENT_MADE', 'ADJUSTMENT'],
        required: true
    },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId },
    notes: { type: String }
}, { timestamps: true });
farmerLedgerSchema.index({ tenantId: 1, farmer: 1, date: 1 });
exports.FarmerLedger = (0, mongoose_1.model)('FarmerLedger', farmerLedgerSchema);
