import { Types } from 'mongoose';
export interface IUser {
    tenantId: Types.ObjectId;
    name: string;
    email: string;
    mobile: string;
    passwordHash: string;
    role: 'SuperAdmin' | 'Owner' | 'Manager' | 'Accountant' | 'Operator' | 'Sales' | 'Delivery';
    permissions: string[];
    status: 'Active' | 'Inactive';
}
export declare const User: import("mongoose").Model<IUser, {}, {}, {}, import("mongoose").Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
