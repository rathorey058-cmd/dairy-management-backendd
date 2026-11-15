import { Types } from 'mongoose';
export interface ICustomer {
    tenantId: Types.ObjectId;
    name: string;
    mobile: string;
    whatsappNumber?: string;
    address?: string;
    area?: string;
    creditLimit: number;
    outstandingBalance: number;
}
export declare const Customer: import("mongoose").Model<ICustomer, {}, {}, {}, import("mongoose").Document<unknown, {}, ICustomer, {}, import("mongoose").DefaultSchemaOptions> & ICustomer & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICustomer>;
