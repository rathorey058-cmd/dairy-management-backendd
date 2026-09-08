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

const calculateYieldMath = (input: EstimateYieldInput): EstimateResult => {
  const { milkQuantity, fat, snf, recipe, historicalModifier } = input;
  const baseFat = 4.0;
  const baseSnf = 8.5;
  const fatDiff = fat - baseFat;
  const snfDiff = snf - baseSnf;

  const predictedYieldPercent = recipe.baselineYieldPercent + 
    (fatDiff * recipe.fatRelationship) + 
    (snfDiff * recipe.snfRelationship) + 
    historicalModifier;

  const expectedOutput = (milkQuantity * predictedYieldPercent) / 100;
  return {
    expectedOutput: Math.round(expectedOutput * 100) / 100,
    expectedMin: Math.round((expectedOutput * 0.96) * 100) / 100,
    expectedMax: Math.round((expectedOutput * 1.04) * 100) / 100
  };
};

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

const calculateCostingMath = (input: CostingInput): CostingResult => {
  const { milkQuantityUsed, avgPurchaseRate, processingCost, packagingCost, otherCost, actualOutput } = input;
  const rawMilkCost = milkQuantityUsed * avgPurchaseRate;
  const totalBatchCost = rawMilkCost + processingCost + packagingCost + otherCost;
  const costPerUnit = totalBatchCost / actualOutput;
  return {
    totalBatchCost: Math.round(totalBatchCost * 100) / 100,
    costPerUnit: Math.round(costPerUnit * 100) / 100
  };
};

describe('Smart Yield & Production Costing Mathematics', () => {

  const mockRecipe: RecipeParameters = {
    baselineYieldPercent: 18.0, // 18% base yield for Paneer
    fatRelationship: 2.0,      // +2.0% yield per point FAT above 4.0
    snfRelationship: 1.0       // +1.0% yield per point SNF above 8.5
  };

  describe('calculateYieldMath', () => {

    it('should calculate correct yield without historical variance', () => {
      // 100L milk with 5.2 FAT and 8.5 SNF.
      // FAT diff = 1.2 -> yield modifier = +2.4%
      // SNF diff = 0 -> yield modifier = 0
      // Yield percent expected = 18.0 + 2.4 = 20.4%
      // Output expected = 100 * 0.204 = 20.4 KG
      const result = calculateYieldMath({
        milkQuantity: 100,
        fat: 5.2,
        snf: 8.5,
        recipe: mockRecipe,
        historicalModifier: 0
      });
      expect(result.expectedOutput).toBe(20.4);
      expect(result.expectedMin).toBe(19.58); // 20.4 * 0.96
      expect(result.expectedMax).toBe(21.22); // 20.4 * 1.04
    });

    it('should adjust yield expectations using historical modifier', () => {
      // Yield percent base expected = 20.4%
      // Historical modifier is -0.5% due to past batch losses
      // Yield percent adjusted expected = 19.9%
      // Output expected = 19.9 KG
      const result = calculateYieldMath({
        milkQuantity: 100,
        fat: 5.2,
        snf: 8.5,
        recipe: mockRecipe,
        historicalModifier: -0.5
      });
      expect(result.expectedOutput).toBe(19.9);
      expect(result.expectedMin).toBe(19.1);  // 19.9 * 0.96
      expect(result.expectedMax).toBe(20.7);  // 19.9 * 1.04
    });

  });

  describe('calculateCostingMath', () => {

    it('should compute total batch cost and unit cost accurately', () => {
      // Milk = 100L, avg purchase rate = Rs 52/L -> Raw milk cost = Rs 5,200
      // processing = Rs 350, packaging = Rs 150, other = 0 -> total cost = Rs 5,700
      // Output = 17 KG
      // Cost per unit = 5700 / 17 = Rs 335.29
      const result = calculateCostingMath({
        milkQuantityUsed: 100,
        avgPurchaseRate: 52,
        processingCost: 350,
        packagingCost: 150,
        otherCost: 0,
        actualOutput: 17
      });
      expect(result.totalBatchCost).toBe(5700.0);
      expect(result.costPerUnit).toBe(335.29);
    });

  });

});
