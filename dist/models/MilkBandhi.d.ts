import { Types, Document } from 'mongoose';
export interface IMilkBandhi extends Document {
    tenantId: Types.ObjectId;
    bandhiNo: number;
    customerName: string;
    mobile: string;
    address?: string;
    area?: string;
    milkType: 'Buffalo' | 'Cow' | 'Mixed';
    shift: 'Morning' | 'Evening' | 'Both';
    dailyQuantity: number;
    rate: number;
    status: 'Active' | 'Paused';
    customer?: Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const MilkBandhi: import("mongoose").Model<IMilkBandhi, {}, {}, {}, Document<unknown, {}, IMilkBandhi, {}, import("mongoose").DefaultSchemaOptions> & IMilkBandhi & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMilkBandhi>;
