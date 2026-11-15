import { Types } from 'mongoose';
export interface IRateRule {
    fat: number;
    snf?: number;
    rate: number;
}
export interface IMilkRateChart {
    tenantId: Types.ObjectId;
    name: string;
    effectiveDate: Date;
    pricingType: 'FAT_ONLY' | 'FAT_SNF' | 'FLAT' | 'MAWA_YIELD';
    cowRules: IRateRule[];
    buffaloRules: IRateRule[];
    mixedRules: IRateRule[];
}
export declare const MilkRateChart: import("mongoose").Model<IMilkRateChart, {}, {}, {}, import("mongoose").Document<unknown, {}, IMilkRateChart, {}, import("mongoose").DefaultSchemaOptions> & IMilkRateChart & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IMilkRateChart>;
