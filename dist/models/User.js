"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: ['SuperAdmin', 'Owner', 'Manager', 'Accountant', 'Operator', 'Sales', 'Delivery'],
        default: 'Operator'
    },
    permissions: [{ type: String }],
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, mobile: 1 }, { unique: true });
exports.User = (0, mongoose_1.model)('User', userSchema);
