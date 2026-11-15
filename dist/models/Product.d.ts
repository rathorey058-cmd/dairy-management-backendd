import { Types } from 'mongoose';
export interface IProduct {
    tenantId: Types.ObjectId;
    name: string;
    unit: 'KG' | 'Litre' | 'Packet' | 'Piece' | 'Bottle' | 'Gram';
    sellingPrice: number;
    costPrice: number;
    stockQty: number;
    category: 'Milk' | 'Paneer' | 'Curd' | 'Ghee' | 'Butter' | 'Cream' | 'Khoya' | 'Other';
    barcode?: string;
    status: 'Active' | 'Inactive';
}
export declare const Product: import("mongoose").Model<IProduct, {}, {}, {}, import("mongoose").Document<unknown, {}, IProduct, {}, import("mongoose").DefaultSchemaOptions> & IProduct & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IProduct>;
