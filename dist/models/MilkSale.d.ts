import mongoose, { Document } from 'mongoose';
export interface IMilkSaleEntry {
    quantity: number;
    rate: number;
    amount: number;
}
export interface IMilkSale extends Document {
    tenantId: mongoose.Types.ObjectId;
    date: Date;
    shift: 'Morning' | 'Evening' | 'Full Day';
    superMilk: IMilkSaleEntry;
    regularMilk: IMilkSaleEntry;
    cowMilk: IMilkSaleEntry;
    totalQuantity: number;
    totalAmount: number;
    paymentMode: 'Cash' | 'UPI' | 'Credit';
    customerName?: string;
    notes?: string;
    recordedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const MilkSale: mongoose.Model<IMilkSale, {}, {}, {}, mongoose.Document<unknown, {}, IMilkSale, {}, mongoose.DefaultSchemaOptions> & IMilkSale & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMilkSale>;
