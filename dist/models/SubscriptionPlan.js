"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlan = void 0;
const mongoose_1 = require("mongoose");
const subscriptionPlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    priceMonthly: { type: Number, required: true },
    priceYearly: { type: Number, required: true },
    maxUsers: { type: Number, required: true },
    maxWhatsAppOrders: { type: Number, required: true },
    features: [{ type: String }],
    storageLimitGb: { type: Number, required: true, default: 5 }
}, { timestamps: true });
exports.SubscriptionPlan = (0, mongoose_1.model)('SubscriptionPlan', subscriptionPlanSchema);
