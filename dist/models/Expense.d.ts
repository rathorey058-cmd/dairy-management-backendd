import { Types } from 'mongoose';
export interface IExpense {
    tenantId: Types.ObjectId;
    date: Date;
    category: string;
    description: string;
    amount: number;
    paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Other';
    referenceNumber?: string;
    operator: Types.ObjectId;
}
export declare const Expense: import("mongoose").Model<IExpense, {}, {}, {}, import("mongoose").Document<unknown, {}, IExpense, {}, import("mongoose").DefaultSchemaOptions> & IExpense & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IExpense>;
