import { Types } from 'mongoose';
export interface IProductionBatch {
    tenantId: Types.ObjectId;
    batchNumber: string;
    date: Date;
    product: Types.ObjectId;
    milkQuantityUsed: number;
    avgFat: number;
    avgSnf: number;
    expectedOutput: number;
    actualOutput?: number;
    variance?: number;
    yieldPercent?: number;
    processingCost: number;
    packagingCost: number;
    otherCost: number;
    totalBatchCost: number;
    costPerUnit?: number;
    operator: Types.ObjectId;
    status: 'InProgress' | 'Completed' | 'Cancelled';
    notes?: string;
}
export declare const ProductionBatch: import("mongoose").Model<IProductionBatch, {}, {}, {}, import("mongoose").Document<unknown, {}, IProductionBatch, {}, import("mongoose").DefaultSchemaOptions> & IProductionBatch & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IProductionBatch>;
