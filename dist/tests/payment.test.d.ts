interface SettlementCalculationInput {
    currentBalance: number;
    totalAdvanceOutstanding: number;
}
interface SettlementResult {
    advanceToAdjust: number;
    netPayable: number;
}
declare const calculateSettlementMath: (input: SettlementCalculationInput) => SettlementResult;
