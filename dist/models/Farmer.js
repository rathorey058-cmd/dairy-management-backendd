"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Farmer = void 0;
const mongoose_1 = require("mongoose");
const farmerSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    farmerId: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    village: { type: String, required: true },
    address: { type: String },
    bankAccount: { type: String },
    ifsc: { type: String },
    upi: { type: String },
    joiningDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    openingBalance: { type: Number, required: true, default: 0 },
    openingAdvance: { type: Number, required: true, default: 0 },
    fatRate: { type: Number, default: 0 },
    tokenNumber: { type: String, trim: true },
    tokenBarcode: { type: String, trim: true },
    photoUrl: { type: String },
    notes: { type: String },
    dpdpConsentGiven: { type: Boolean, default: true },
    dpdpConsentDate: { type: Date, default: Date.now },
    dpdpConsentChannel: { type: String, default: 'WHATSAPP_SMS_PHYSICAL' }
}, { timestamps: true });
farmerSchema.index({ tenantId: 1, tokenNumber: 1 });
farmerSchema.index({ tenantId: 1, tokenBarcode: 1 });
farmerSchema.index({ tenantId: 1, farmerId: 1 }, { unique: true });
exports.Farmer = (0, mongoose_1.model)('Farmer', farmerSchema);
