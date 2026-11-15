"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = require("mongoose");
const orderItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
}, { _id: false });
const orderSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerName: { type: String },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    orderDate: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ['Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Failed', 'Cancelled'],
        default: 'Pending',
        index: true
    },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Credit'], required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
    deliveryBoy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    deliveryAddress: { type: String },
    deliveryProofUrl: { type: String },
    failedReason: { type: String },
    whatsappMessageId: { type: String },
    source: { type: String, enum: ['Counter', 'WhatsApp', 'Web', 'Other'], default: 'Counter' },
    notes: { type: String }
}, { timestamps: true });
orderSchema.index({ tenantId: 1, orderDate: -1 });
exports.Order = (0, mongoose_1.model)('Order', orderSchema);
