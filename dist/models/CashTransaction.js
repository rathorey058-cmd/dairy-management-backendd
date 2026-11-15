"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashTransaction = void 0;
const mongoose_1 = require("mongoose");
const cashTransactionSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    type: {
        type: String,
        enum: ['CASH_SALE', 'CUSTOMER_COLLECTION', 'FARMER_PAYMENT', 'EXPENSE', 'OTHER_IN', 'OTHER_OUT'],
        required: true
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId }
}, { timestamps: true });
cashTransactionSchema.index({ tenantId: 1, date: -1 });
exports.CashTransaction = (0, mongoose_1.model)('CashTransaction', cashTransactionSchema);
