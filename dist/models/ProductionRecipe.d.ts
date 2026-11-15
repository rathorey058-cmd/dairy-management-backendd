import { Types } from 'mongoose';
export interface IProductionRecipe {
    tenantId: Types.ObjectId;
    product: Types.ObjectId;
    baselineYieldPercent: number;
    minExpectedYieldPercent: number;
    maxExpectedYieldPercent: number;
    fatRelationship: number;
    snfRelationship: number;
    processingCostPerUnit: number;
    packagingCostPerUnit: number;
    notes?: string;
}
export declare const ProductionRecipe: import("mongoose").Model<IProductionRecipe, {}, {}, {}, import("mongoose").Document<unknown, {}, IProductionRecipe, {}, import("mongoose").DefaultSchemaOptions> & IProductionRecipe & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IProductionRecipe>;
