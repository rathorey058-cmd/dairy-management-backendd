"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTransaction = void 0;
const mongoose_1 = require("mongoose");
const inventoryTransactionSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', index: true },
    isRawMilk: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['Opening', 'Purchase', 'Production_In', 'Production_Out', 'Sales', 'Wastage', 'Adjustment'],
        required: true
    },
    quantity: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId },
    notes: { type: String }
}, { timestamps: true });
inventoryTransactionSchema.index({ tenantId: 1, date: -1 });
exports.InventoryTransaction = (0, mongoose_1.model)('InventoryTransaction', inventoryTransactionSchema);
