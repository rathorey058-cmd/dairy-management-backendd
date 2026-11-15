import { Types } from 'mongoose';
export interface IDailyClosing {
    tenantId: Types.ObjectId;
    date: Date;
    closedBy: Types.ObjectId;
    isClosed: boolean;
    summary: {
        milkQuantity: number;
        avgFat: number;
        avgSnf: number;
        totalSales: number;
        cashSales: number;
        creditSales: number;
        expenses: number;
        farmerPayments: number;
        expectedGalla: number;
        actualGalla: number;
        difference: number;
        expectedProfit: number;
        actualProfit: number;
    };
}
export declare const DailyClosing: import("mongoose").Model<IDailyClosing, {}, {}, {}, import("mongoose").Document<unknown, {}, IDailyClosing, {}, import("mongoose").DefaultSchemaOptions> & IDailyClosing & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IDailyClosing>;
