import { Types } from 'mongoose';
export interface IFarmerAdvance {
    tenantId: Types.ObjectId;
    farmer: Types.ObjectId;
    date: Date;
    amount: number;
    paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
    referenceNumber?: string;
    remainingAdvance: number;
    notes?: string;
}
export declare const FarmerAdvance: import("mongoose").Model<IFarmerAdvance, {}, {}, {}, import("mongoose").Document<unknown, {}, IFarmerAdvance, {}, import("mongoose").DefaultSchemaOptions> & IFarmerAdvance & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IFarmerAdvance>;
