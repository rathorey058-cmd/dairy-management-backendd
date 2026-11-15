import { Types, Document } from 'mongoose';
export interface IDeliveryItem {
    bandhi: Types.ObjectId;
    bandhiNo: number;
    customerName: string;
    customer?: Types.ObjectId;
    milkType: 'Buffalo' | 'Cow' | 'Mixed';
    standardQuantity: number;
    deliveredQuantity: number;
    rate: number;
    amount: number;
    status: 'DELIVERED' | 'SKIPPED' | 'EXTRA';
    notes?: string;
}
export interface IBandhiDeliveryLog extends Document {
    tenantId: Types.ObjectId;
    date: Date;
    shift: 'Morning' | 'Evening';
    deliveries: IDeliveryItem[];
    totalMilkDelivered: number;
    totalAmount: number;
    deliveredCount: number;
    skippedCount: number;
    isConfirmed: boolean;
    recordedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BandhiDeliveryLog: import("mongoose").Model<IBandhiDeliveryLog, {}, {}, {}, Document<unknown, {}, IBandhiDeliveryLog, {}, import("mongoose").DefaultSchemaOptions> & IBandhiDeliveryLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBandhiDeliveryLog>;
