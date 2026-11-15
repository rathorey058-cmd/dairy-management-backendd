import { Types } from 'mongoose';
export interface IInventoryTransaction {
    tenantId: Types.ObjectId;
    product: Types.ObjectId;
    isRawMilk: boolean;
    type: 'Opening' | 'Purchase' | 'Production_In' | 'Production_Out' | 'Sales' | 'Wastage' | 'Adjustment';
    quantity: number;
    date: Date;
    referenceId?: Types.ObjectId;
    notes?: string;
}
export declare const InventoryTransaction: import("mongoose").Model<IInventoryTransaction, {}, {}, {}, import("mongoose").Document<unknown, {}, IInventoryTransaction, {}, import("mongoose").DefaultSchemaOptions> & IInventoryTransaction & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IInventoryTransaction>;
