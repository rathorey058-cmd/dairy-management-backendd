"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const expenseSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Other'], required: true },
    referenceNumber: { type: String },
    operator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
expenseSchema.index({ tenantId: 1, date: -1 });
exports.Expense = (0, mongoose_1.model)('Expense', expenseSchema);
