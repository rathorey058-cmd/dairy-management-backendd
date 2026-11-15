import type { IMilkRateChart } from '../models/MilkRateChart';
/**
 * Calculates milk rate based on rate chart, milk type, FAT and SNF.
 */
export declare const calculateMilkRate: (rateChart: IMilkRateChart, milkType: "Cow" | "Buffalo" | "Mixed" | "Other", fat: number, snf: number) => number;
/**
 * Calculates quantity-weighted average FAT and SNF.
 */
export declare const calculateWeightedAverages: (collections: {
    quantity: number;
    fat?: number;
    snf?: number;
}[]) => {
    avgFat: number;
    avgSnf: number;
    totalQty: number;
};
/**
 * Update ledger helper.
 * When a transaction is booked, calculate the new running balance and save ledger entry.
 */
export declare const postLedgerEntry: (tenantId: string, farmerId: string, date: Date, transactionType: "MILK_SUPPLY" | "ADVANCE_GIVEN" | "PAYMENT_MADE" | "ADJUSTMENT", amount: number, description: string, referenceId?: string) => Promise<import("mongoose").Document<unknown, {}, import("../models/FarmerLedger").IFarmerLedger, {}, import("mongoose").DefaultSchemaOptions> & import("../models/FarmerLedger").IFarmerLedger & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}>;
