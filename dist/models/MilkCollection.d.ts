import { Types } from 'mongoose';
export interface IMilkCollection {
    tenantId: Types.ObjectId;
    farmer: Types.ObjectId;
    date: Date;
    shift: 'Morning' | 'Evening';
    milkType: 'Cow' | 'Buffalo' | 'Mixed' | 'Other';
    quantity: number;
    fat?: number;
    snf?: number;
    clr?: number;
    mawaYield?: number;
    mawaRatePerKg?: number;
    rate: number;
    amount: number;
    operator: Types.ObjectId;
    notes?: string;
    aiVerification?: {
        aiDetected?: {
            weight?: number;
            fat?: number;
            snf?: number;
            clr?: number;
            confidence?: number;
            rawText?: string;
        };
        operatorEntered?: {
            weight?: number;
            fat?: number;
            snf?: number;
        };
        isMismatched?: boolean;
        mismatchReason?: string;
        snapshotImage?: string;
        verificationStatus?: 'MATCHED' | 'OVERRIDDEN' | 'MANUAL' | 'FLAGGED';
    };
}
export declare const MilkCollection: import("mongoose").Model<IMilkCollection, {}, {}, {}, import("mongoose").Document<unknown, {}, IMilkCollection, {}, import("mongoose").DefaultSchemaOptions> & IMilkCollection & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IMilkCollection>;
