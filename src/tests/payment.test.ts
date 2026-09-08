interface SettlementCalculationInput {
  currentBalance: number;
  totalAdvanceOutstanding: number;
}

interface SettlementResult {
  advanceToAdjust: number;
  netPayable: number;
}

const calculateSettlementMath = (input: SettlementCalculationInput): SettlementResult => {
  const { currentBalance, totalAdvanceOutstanding } = input;
  const advanceToAdjust = Math.min(Math.max(0, currentBalance), totalAdvanceOutstanding);
  const netPayable = Math.round((currentBalance - advanceToAdjust) * 100) / 100;
  return {
    advanceToAdjust,
    netPayable
  };
};

describe('Farmer Settlement Financial Arithmetic', () => {

  it('should adjust full outstanding advance if balance exceeds advance', () => {
    // Current milk value = 18,500, outstanding advance = 5,000
    // Expected: advance adjusted = 5,000, net payable = 13,500
    const result = calculateSettlementMath({
      currentBalance: 18500,
      totalAdvanceOutstanding: 5000
    });
    expect(result.advanceToAdjust).toBe(5000);
    expect(result.netPayable).toBe(13500);
  });

  it('should adjust partial advance if balance is lower than total advance', () => {
    // Current milk value = 3,000, outstanding advance = 5,000
    // Expected: advance adjusted = 3,000, net payable = 0 (remaining 2,000 advance is retained)
    const result = calculateSettlementMath({
      currentBalance: 3000,
      totalAdvanceOutstanding: 5000
    });
    expect(result.advanceToAdjust).toBe(3000);
    expect(result.netPayable).toBe(0);
  });

  it('should not adjust advance if balance is zero or negative', () => {
    const result = calculateSettlementMath({
      currentBalance: -500,
      totalAdvanceOutstanding: 1000
    });
    expect(result.advanceToAdjust).toBe(0);
    expect(result.netPayable).toBe(-500);
  });

  it('should handle zero advances gracefully', () => {
    const result = calculateSettlementMath({
      currentBalance: 12000,
      totalAdvanceOutstanding: 0
    });
    expect(result.advanceToAdjust).toBe(0);
    expect(result.netPayable).toBe(12000);
  });

});
