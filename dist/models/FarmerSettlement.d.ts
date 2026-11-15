import { Types } from 'mongoose';
export interface IFarmerSettlement {
    tenantId: Types.ObjectId;
    farmer: Types.ObjectId;
    date: Date;
    milkValue: number;
    advanceAdjusted: number;
    alreadyPaid: number;
    netPayable: number;
    amountPaid: number;
    paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
    referenceNumber?: string;
    notes?: string;
}
export declare const FarmerSettlement: import("mongoose").Model<IFarmerSettlement, {}, {}, {}, import("mongoose").Document<unknown, {}, IFarmerSettlement, {}, import("mongoose").DefaultSchemaOptions> & IFarmerSettlement & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IFarmerSettlement>;
