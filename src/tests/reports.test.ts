interface DayLockInput {
  targetDate: string;
  closedDates: string[]; // List of closed date strings
}

const checkDayLockedMath = (input: DayLockInput): boolean => {
  const { targetDate, closedDates } = input;
  const targetTime = new Date(targetDate).setHours(0,0,0,0);
  
  return closedDates.some(closedDate => {
    const closedTime = new Date(closedDate).setHours(0,0,0,0);
    return targetTime === closedTime;
  });
};

interface DiscrepancyInput {
  actualGalla: number;
  expectedGalla: number;
}

const calculateDiscrepancyMath = (input: DiscrepancyInput): number => {
  const { actualGalla, expectedGalla } = input;
  return Math.round((actualGalla - expectedGalla) * 100) / 100;
};

describe('Day Closing Lock & Discrepancy Reconciliations', () => {

  describe('checkDayLockedMath', () => {

    it('should lock operations if target date is in closedDates list', () => {
      const closedDates = ['2026-08-30', '2026-08-29'];
      const targetDate = '2026-08-30T12:00:00Z'; // same day
      const isLocked = checkDayLockedMath({ targetDate, closedDates });
      expect(isLocked).toBe(true);
    });

    it('should unlock operations if target date is not closed', () => {
      const closedDates = ['2026-08-29'];
      const targetDate = '2026-08-30T10:00:00Z'; // next day
      const isLocked = checkDayLockedMath({ targetDate, closedDates });
      expect(isLocked).toBe(false);
    });

  });

  describe('calculateDiscrepancyMath', () => {

    it('should output negative discrepancy when cash in hand is lower than expected', () => {
      const result = calculateDiscrepancyMath({
        actualGalla: 9850.50,
        expectedGalla: 10000.00
      });
      expect(result).toBe(-149.50);
    });

    it('should output positive discrepancy when cash in hand exceeds expected', () => {
      const result = calculateDiscrepancyMath({
        actualGalla: 10120.00,
        expectedGalla: 10000.00
      });
      expect(result).toBe(120.00);
    });

    it('should output zero discrepancy when cash matches expected exactly', () => {
      const result = calculateDiscrepancyMath({
        actualGalla: 15230.15,
        expectedGalla: 15230.15
      });
      expect(result).toBe(0.00);
    });

  });

});
