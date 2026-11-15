import { Types } from 'mongoose';
export interface ICustomerLedger {
    tenantId: Types.ObjectId;
    customer: Types.ObjectId;
    date: Date;
    description: string;
    type: 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT';
    amount: number;
    balance: number;
    referenceId?: Types.ObjectId;
}
export declare const CustomerLedger: import("mongoose").Model<ICustomerLedger, {}, {}, {}, import("mongoose").Document<unknown, {}, ICustomerLedger, {}, import("mongoose").DefaultSchemaOptions> & ICustomerLedger & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICustomerLedger>;
