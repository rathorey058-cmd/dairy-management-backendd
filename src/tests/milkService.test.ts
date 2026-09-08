import { calculateMilkRate, calculateWeightedAverages } from '../services/milkService';
import { IMilkRateChart } from '../models/MilkRateChart';
import { Types } from 'mongoose';

describe('Milk Service Logic Tests', () => {
  
  // 1. Setup mock rate chart
  const mockRateChart: IMilkRateChart = {
    tenantId: new Types.ObjectId(),
    name: 'Standard Chart',
    effectiveDate: new Date(),
    pricingType: 'FAT_ONLY',
    cowRules: [
      { fat: 3.5, rate: 40.0 },
      { fat: 4.0, rate: 44.0 },
      { fat: 4.5, rate: 48.0 }
    ],
    buffaloRules: [
      { fat: 6.0, rate: 55.0 },
      { fat: 7.0, rate: 65.0 }
    ],
    mixedRules: []
  };

  describe('calculateMilkRate', () => {
    
    it('should return exact match rate when FAT matches a rule', () => {
      const rate = calculateMilkRate(mockRateChart, 'Cow', 4.0, 8.5);
      expect(rate).toBe(44.0);
    });

    it('should interpolate between rule points', () => {
      // 4.25 fat is exactly halfway between 4.0 (44) and 4.5 (48) -> expected 46
      const rate = calculateMilkRate(mockRateChart, 'Cow', 4.25, 8.5);
      expect(rate).toBe(46.0);
    });

    it('should scale rate for higher fat values', () => {
      // Last rule is 4.5 (48), second-to-last is 4.0 (44)
      // FAT diff = 0.5, rate diff = 4 -> scale = 8 per unit FAT.
      // For fat 5.0 -> expected 48 + 0.5 * 8 = 52.0
      const rate = calculateMilkRate(mockRateChart, 'Cow', 5.0, 8.5);
      expect(rate).toBe(52.0);
    });

    it('should floor to lower bound rule rate if fat is below lowest rule fat', () => {
      const rate = calculateMilkRate(mockRateChart, 'Cow', 3.0, 8.5);
      expect(rate).toBe(40.0);
    });

    it('should use buffalo rules for Buffalo milk type', () => {
      const rate = calculateMilkRate(mockRateChart, 'Buffalo', 6.5, 9.0);
      // Halfway between 6.0 (55) and 7.0 (65) -> expected 60
      expect(rate).toBe(60.0);
    });

  });

  describe('calculateWeightedAverages', () => {

    it('should compute quantity-weighted average FAT and SNF', () => {
      const collections = [
        { quantity: 100, fat: 4.0, snf: 8.5 }, // Fat sum: 400, Snf sum: 850
        { quantity: 200, fat: 5.5, snf: 9.1 }  // Fat sum: 1100, Snf sum: 1820
      ];
      // Total Qty = 300
      // Weighted Fat = (400 + 1100) / 300 = 1500 / 300 = 5.0
      // Weighted Snf = (850 + 1820) / 300 = 2670 / 300 = 8.9

      const result = calculateWeightedAverages(collections);
      expect(result.totalQty).toBe(300);
      expect(result.avgFat).toBe(5.0);
      expect(result.avgSnf).toBe(8.9);
    });

    it('should return 0 when collection list is empty', () => {
      const result = calculateWeightedAverages([]);
      expect(result.totalQty).toBe(0);
      expect(result.avgFat).toBe(0);
      expect(result.avgSnf).toBe(0);
    });

  });

});
