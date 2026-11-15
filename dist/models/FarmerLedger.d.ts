import { Types } from 'mongoose';
export interface IFarmerLedger {
    tenantId: Types.ObjectId;
    farmer: Types.ObjectId;
    date: Date;
    description: string;
    transactionType: 'MILK_SUPPLY' | 'ADVANCE_GIVEN' | 'PAYMENT_MADE' | 'ADJUSTMENT';
    amount: number;
    balance: number;
    referenceId?: Types.ObjectId;
    notes?: string;
}
export declare const FarmerLedger: import("mongoose").Model<IFarmerLedger, {}, {}, {}, import("mongoose").Document<unknown, {}, IFarmerLedger, {}, import("mongoose").DefaultSchemaOptions> & IFarmerLedger & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IFarmerLedger>;
