import { Types } from 'mongoose';
export interface ICashTransaction {
    tenantId: Types.ObjectId;
    date: Date;
    type: 'CASH_SALE' | 'CUSTOMER_COLLECTION' | 'FARMER_PAYMENT' | 'EXPENSE' | 'OTHER_IN' | 'OTHER_OUT';
    amount: number;
    description: string;
    referenceId?: Types.ObjectId;
}
export declare const CashTransaction: import("mongoose").Model<ICashTransaction, {}, {}, {}, import("mongoose").Document<unknown, {}, ICashTransaction, {}, import("mongoose").DefaultSchemaOptions> & ICashTransaction & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICashTransaction>;
