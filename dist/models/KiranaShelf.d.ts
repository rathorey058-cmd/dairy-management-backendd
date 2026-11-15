import { Types } from 'mongoose';
export interface IKiranaShelf {
    tenantId: Types.ObjectId;
    blockCode: string;
    shelfName: string;
    assignedProduct?: Types.ObjectId;
    productName: string;
    category: string;
    currentStock: number;
    capacity: number;
    lowStockThreshold: number;
    lastCameraCheck?: Date;
    lastDetectedCount?: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'EMPTY' | 'MISPLACED';
    storageType?: 'SHELF' | 'FRIDGE_FREEZER';
    notes?: string;
}
export declare const KiranaShelf: import("mongoose").Model<IKiranaShelf, {}, {}, {}, import("mongoose").Document<unknown, {}, IKiranaShelf, {}, import("mongoose").DefaultSchemaOptions> & IKiranaShelf & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IKiranaShelf>;
