import type { IMilkRateChart, IRateRule } from '../models/MilkRateChart';
import { FarmerLedger } from '../models/FarmerLedger';

/**
 * Calculates milk rate based on rate chart, milk type, FAT and SNF.
 */
export const calculateMilkRate = (
  rateChart: IMilkRateChart,
  milkType: 'Cow' | 'Buffalo' | 'Mixed' | 'Other',
  fat: number,
  snf: number
): number => {
  if (rateChart.pricingType === 'FLAT') {
    // If flat pricing is configured, we return the base price or default rules
    return rateChart.cowRules[0]?.rate || 0;
  }

  // Get active rules for the specific milk type
  let rules: IRateRule[] = [];
  if (milkType === 'Cow') {
    rules = rateChart.cowRules;
  } else if (milkType === 'Buffalo') {
    rules = rateChart.buffaloRules;
  } else {
    rules = rateChart.mixedRules;
  }

  if (!rules || rules.length === 0) {
    return 0;
  }

  if (rateChart.pricingType === 'FAT_ONLY') {
    // Match based on FAT only
    // Find exact or closest rule
    const exactMatch = rules.find(r => Math.abs(r.fat - fat) < 0.01);
    if (exactMatch) {
      return exactMatch.rate;
    }

    // Sort rules by FAT
    const sorted = [...rules].sort((a, b) => a.fat - b.fat);
    
    // Check out of bounds
    if (fat <= sorted[0].fat) {
      return sorted[0].rate;
    }
    if (fat >= sorted[sorted.length - 1].fat) {
      // Linearly scale up for higher FAT values
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      if (prev) {
        const fatDiff = last.fat - prev.fat;
        const rateDiff = last.rate - prev.rate;
        const scale = rateDiff / fatDiff;
        return Math.round((last.rate + (fat - last.fat) * scale) * 10) / 10;
      }
      return last.rate;
    }

    // Interpolate between closest points
    for (let i = 0; i < sorted.length - 1; i++) {
      if (fat >= sorted[i].fat && fat <= sorted[i + 1].fat) {
        const x0 = sorted[i].fat;
        const y0 = sorted[i].rate;
        const x1 = sorted[i + 1].fat;
        const y1 = sorted[i + 1].rate;
        return Math.round((y0 + (fat - x0) * (y1 - y0) / (x1 - x0)) * 10) / 10;
      }
    }
  } else if (rateChart.pricingType === 'FAT_SNF') {
    // Match based on both FAT and SNF
    // In a production app, the chart has a 2D grid. We find the closest match.
    // Filter by closest SNF first
    const closestSNFRules = rules.filter(r => r.snf && Math.abs(r.snf - snf) < 0.2);
    if (closestSNFRules.length > 0) {
      const exactFat = closestSNFRules.find(r => Math.abs(r.fat - fat) < 0.01);
      if (exactFat) {
        return exactFat.rate;
      }
      const sorted = closestSNFRules.sort((a, b) => a.fat - b.fat);
      if (fat <= sorted[0].fat) return sorted[0].rate;
      if (fat >= sorted[sorted.length - 1].fat) return sorted[sorted.length - 1].rate;
      
      // Interpolate
      for (let i = 0; i < sorted.length - 1; i++) {
        if (fat >= sorted[i].fat && fat <= sorted[i + 1].fat) {
          const x0 = sorted[i].fat;
          const y0 = sorted[i].rate;
          const x1 = sorted[i + 1].fat;
          const y1 = sorted[i + 1].rate;
          return Math.round((y0 + (fat - x0) * (y1 - y0) / (x1 - x0)) * 10) / 10;
        }
      }
    }
  }

  // Fallback to average rules if nothing matched
  return rules[0]?.rate || 0;
};

/**
 * Calculates quantity-weighted average FAT and SNF.
 */
export const calculateWeightedAverages = (
  collections: { quantity: number; fat?: number; snf?: number }[]
): { avgFat: number; avgSnf: number; totalQty: number } => {
  if (!collections || collections.length === 0) {
    return { avgFat: 0, avgSnf: 0, totalQty: 0 };
  }

  let totalQty = 0;
  let totalFatSum = 0;
  let totalSnfSum = 0;

  for (const col of collections) {
    totalQty += col.quantity;
    totalFatSum += col.quantity * (col.fat || 0);
    totalSnfSum += col.quantity * (col.snf || 0);
  }

  return {
    avgFat: totalQty > 0 ? Math.round((totalFatSum / totalQty) * 100) / 100 : 0,
    avgSnf: totalQty > 0 ? Math.round((totalSnfSum / totalQty) * 100) / 100 : 0,
    totalQty
  };
};

/**
 * Update ledger helper.
 * When a transaction is booked, calculate the new running balance and save ledger entry.
 */
export const postLedgerEntry = async (
  tenantId: string,
  farmerId: string,
  date: Date,
  transactionType: 'MILK_SUPPLY' | 'ADVANCE_GIVEN' | 'PAYMENT_MADE' | 'ADJUSTMENT',
  amount: number,
  description: string,
  referenceId?: string
) => {
  // Find last ledger entry to get running balance
  const lastEntry = await FarmerLedger.findOne({ tenantId, farmer: farmerId })
    .sort({ date: -1, createdAt: -1 });

  const currentBalance = lastEntry ? lastEntry.balance : 0;
  // Positive amount increases what is payable (e.g. MILK_SUPPLY), negative decreases it (e.g. PAYMENT_MADE)
  const newBalance = Math.round((currentBalance + amount) * 100) / 100;

  const ledgerEntry = new FarmerLedger({
    tenantId,
    farmer: farmerId,
    date,
    transactionType,
    amount,
    balance: newBalance,
    description,
    referenceId
  });

  await ledgerEntry.save();
  return ledgerEntry;
};
