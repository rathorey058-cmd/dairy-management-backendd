interface RecipeParameters {
    baselineYieldPercent: number;
    fatRelationship: number;
    snfRelationship: number;
}
interface EstimateYieldInput {
    milkQuantity: number;
    fat: number;
    snf: number;
    recipe: RecipeParameters;
    historicalModifier: number;
}
interface EstimateResult {
    expectedOutput: number;
    expectedMin: number;
    expectedMax: number;
}
declare const calculateYieldMath: (input: EstimateYieldInput) => EstimateResult;
interface CostingInput {
    milkQuantityUsed: number;
    avgPurchaseRate: number;
    processingCost: number;
    packagingCost: number;
    otherCost: number;
    actualOutput: number;
}
interface CostingResult {
    totalBatchCost: number;
    costPerUnit: number;
}
declare const calculateCostingMath: (input: CostingInput) => CostingResult;
