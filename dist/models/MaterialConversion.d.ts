import { Types, Document } from 'mongoose';
export interface IMaterialConversion extends Document {
    tenantId: Types.ObjectId;
    conversionType: 'CREAM_TO_GHEE' | 'MILK_TO_PANEER' | 'MILK_TO_LASSI' | 'MILK_TO_CURD' | 'MILK_TO_CREAM' | 'MILK_TO_KHOYA' | 'CUSTOM';
    date: Date;
    inputMaterial: string;
    inputQuantity: number;
    inputUnit: string;
    outputProduct: string;
    outputQuantity: number;
    outputUnit: string;
    yieldPercent: number;
    byProduct?: {
        name: string;
        quantity: number;
        unit: string;
    };
    notes?: string;
    operator?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const MaterialConversion: import("mongoose").Model<IMaterialConversion, {}, {}, {}, Document<unknown, {}, IMaterialConversion, {}, import("mongoose").DefaultSchemaOptions> & IMaterialConversion & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMaterialConversion>;
