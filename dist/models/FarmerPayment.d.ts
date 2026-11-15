import { Types } from 'mongoose';
export interface IFarmerPayment {
    tenantId: Types.ObjectId;
    farmer: Types.ObjectId;
    date: Date;
    amount: number;
    paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
    referenceNumber?: string;
    notes?: string;
}
export declare const FarmerPayment: import("mongoose").Model<IFarmerPayment, {}, {}, {}, import("mongoose").Document<unknown, {}, IFarmerPayment, {}, import("mongoose").DefaultSchemaOptions> & IFarmerPayment & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IFarmerPayment>;
