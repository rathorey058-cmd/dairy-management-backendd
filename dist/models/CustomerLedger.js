"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerLedger = void 0;
const mongoose_1 = require("mongoose");
const customerLedgerSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['INVOICE', 'PAYMENT', 'ADJUSTMENT'], required: true },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId }
}, { timestamps: true });
customerLedgerSchema.index({ tenantId: 1, customer: 1, date: 1 });
exports.CustomerLedger = (0, mongoose_1.model)('CustomerLedger', customerLedgerSchema);
