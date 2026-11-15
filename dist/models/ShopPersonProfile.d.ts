import { Types, Document } from 'mongoose';
export interface IShopPersonProfile extends Document {
    tenantId: Types.ObjectId;
    name: string;
    role: 'OWNER' | 'STAFF' | 'HELPER' | 'CASHIER';
    mobile?: string;
    photoBase64?: string;
    dutyTiming?: {
        start: string;
        end: string;
    };
    customInstructions?: string;
    status: 'ACTIVE' | 'INACTIVE';
    notes?: string;
    lastSeenAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShopPersonProfile: import("mongoose").Model<IShopPersonProfile, {}, {}, {}, Document<unknown, {}, IShopPersonProfile, {}, import("mongoose").DefaultSchemaOptions> & IShopPersonProfile & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IShopPersonProfile>;
