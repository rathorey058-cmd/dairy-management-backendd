"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilkSale = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MilkSaleEntrySchema = new mongoose_1.Schema({
    quantity: { type: Number, required: true, default: 0 },
    rate: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 }
}, { _id: false });
const MilkSaleSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    shift: { type: String, enum: ['Morning', 'Evening', 'Full Day'], default: 'Morning' },
    superMilk: { type: MilkSaleEntrySchema, required: true },
    regularMilk: { type: MilkSaleEntrySchema, required: true },
    cowMilk: { type: MilkSaleEntrySchema, required: true },
    totalQuantity: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Credit'], default: 'Cash' },
    customerName: { type: String, default: 'Counter / Bulk Buyers' },
    notes: { type: String },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
exports.MilkSale = mongoose_1.default.model('MilkSale', MilkSaleSchema);
