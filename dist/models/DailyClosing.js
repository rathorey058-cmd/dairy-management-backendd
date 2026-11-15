"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyClosing = void 0;
const mongoose_1 = require("mongoose");
const dailyClosingSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, index: true },
    closedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    isClosed: { type: Boolean, required: true, default: false },
    summary: {
        milkQuantity: { type: Number, required: true, default: 0 },
        avgFat: { type: Number, required: true, default: 0 },
        avgSnf: { type: Number, required: true, default: 0 },
        totalSales: { type: Number, required: true, default: 0 },
        cashSales: { type: Number, required: true, default: 0 },
        creditSales: { type: Number, required: true, default: 0 },
        expenses: { type: Number, required: true, default: 0 },
        farmerPayments: { type: Number, required: true, default: 0 },
        expectedGalla: { type: Number, required: true, default: 0 },
        actualGalla: { type: Number, required: true, default: 0 },
        difference: { type: Number, required: true, default: 0 },
        expectedProfit: { type: Number, required: true, default: 0 },
        actualProfit: { type: Number, required: true, default: 0 }
    }
}, { timestamps: true });
dailyClosingSchema.index({ tenantId: 1, date: 1 }, { unique: true });
exports.DailyClosing = (0, mongoose_1.model)('DailyClosing', dailyClosingSchema);
