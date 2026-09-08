import { Request, Response } from 'express';
import { MilkCollection } from '../models/MilkCollection';
import { MilkRateChart } from '../models/MilkRateChart';
import { Farmer } from '../models/Farmer';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { MilkSale } from '../models/MilkSale';
import { ProductionBatch } from '../models/ProductionBatch';
import { MaterialConversion } from '../models/MaterialConversion';
import { Product } from '../models/Product';
import { calculateMilkRate, calculateWeightedAverages, postLedgerEntry } from '../services/milkService';

export const createMilkEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      farmerId, date, shift, milkType, quantity, 
      fat, snf, clr, notes, mawaYield, mawaRatePerKg 
    } = req.body;

    if (!farmerId || !shift || !milkType || !quantity) {
      res.status(400).json({ message: 'Farmer ID, shift, milk type, and quantity are required.' });
      return;
    }

    // Verify farmer
    const farmerDoc = await Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
    if (!farmerDoc) {
      res.status(404).json({ message: 'Farmer not found.' });
      return;
    }

    // Get active rate chart (latest effective date before or equal to target date)
    const targetDate = date ? new Date(date) : new Date();
    const rateChart = await MilkRateChart.findOne({
      tenantId: req.tenantId,
      effectiveDate: { $lte: targetDate }
    }).sort({ effectiveDate: -1 });

    if (!rateChart) {
      res.status(400).json({ message: 'No active milk rate chart configured. Please configure pricing first.' });
      return;
    }

    // Calculate rate based on pricingType
    let rate = 0;
    if (farmerDoc.fatRate && farmerDoc.fatRate > 0) {
      if (fat === undefined || fat === null) {
        res.status(400).json({ message: 'FAT (%) is required for Farmer FAT Rate pricing.' });
        return;
      }
      rate = Math.round((fat * farmerDoc.fatRate) * 100) / 100;
    } else if (rateChart.pricingType === 'MAWA_YIELD') {
      if (mawaYield === undefined || mawaYield === null) {
        res.status(400).json({ message: 'Mawa Yield (%) is required for Mawa Yield pricing mode.' });
        return;
      }
      const actualMawaRate = mawaRatePerKg || 300; // Fallback to 300 if not specified
      rate = Math.round(((mawaYield / 100) * actualMawaRate) * 100) / 100;
    } else if (rateChart.pricingType === 'FAT_ONLY') {
      if (fat === undefined || fat === null) {
        res.status(400).json({ message: 'FAT (%) is required for FAT Only pricing mode.' });
        return;
      }
      rate = calculateMilkRate(rateChart, milkType, fat, 0);
    } else {
      if (fat === undefined || fat === null || snf === undefined || snf === null) {
        res.status(400).json({ message: 'FAT (%) and SNF (%) are required for this pricing mode.' });
        return;
      }
      rate = calculateMilkRate(rateChart, milkType, fat, snf);
    }

    const amount = Math.round((quantity * rate) * 100) / 100;

    // Create entry
    const entry = new MilkCollection({
      tenantId: req.tenantId,
      farmer: farmerId,
      date: targetDate,
      shift,
      milkType,
      quantity,
      fat: fat || 0,
      snf: snf || 0,
      clr,
      mawaYield,
      mawaRatePerKg,
      rate,
      amount,
      operator: req.user?.id,
      notes
    });

    await entry.save();

    // Create Raw Milk inventory credit
    await InventoryTransaction.create({
      tenantId: req.tenantId,
      isRawMilk: true,
      type: 'Purchase',
      quantity,
      date: targetDate,
      referenceId: entry._id,
      notes: `Milk collection - Farmer ${farmerDoc.farmerId} (${milkType})`
    });

    // Update farmer ledger (Milk value is credited to the farmer, so amount is positive payable)
    await postLedgerEntry(
      req.tenantId!.toString(),
      farmerId,
      targetDate,
      'MILK_SUPPLY',
      amount,
      `Milk Supplied: ${quantity}L @ Rs ${rate}/L (Shift: ${shift})`,
      entry._id.toString()
    );

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create Milk Entry Error:', error);
    res.status(500).json({ message: 'Error booking milk entry.' });
  }
};

export const getMilkCollections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId, shift, milkType, date, startDate, endDate } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (farmerId) {
      filter.farmer = farmerId;
    }
    if (shift) {
      filter.shift = shift;
    }
    if (milkType) {
      filter.milkType = milkType;
    }
    if (date) {
      const s = new Date(date as string);
      s.setHours(0, 0, 0, 0);
      const e = new Date(date as string);
      e.setHours(23, 59, 59, 999);
      filter.date = { $gte: s, $lte: e };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const s = new Date(startDate as string);
        s.setHours(0, 0, 0, 0);
        filter.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate as string);
        e.setHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    const collections = await MilkCollection.find(filter)
      .populate('farmer', 'farmerId name mobile village')
      .populate('operator', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.json(collections);
  } catch (error) {
    console.error('Get Milk Collections Error:', error);
    res.status(500).json({ message: 'Error retrieving milk collections.' });
  }
};

export const getMilkSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const s = new Date(startDate as string);
        s.setHours(0, 0, 0, 0);
        filter.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate as string);
        e.setHours(23, 59, 59, 999);
        filter.date.$lte = e;
      }
    }

    // Parallel fetch collections, direct sales, production batches, conversions, and stock
    const [collections, directSales, productionBatches, conversions, inventoryDocs, products] = await Promise.all([
      MilkCollection.find(filter),
      MilkSale.find(filter),
      ProductionBatch.find(filter),
      MaterialConversion.find(filter),
      InventoryTransaction.find({ tenantId: req.tenantId, isRawMilk: true }),
      Product.find({ tenantId: req.tenantId })
    ]);

    const summaryStats = calculateWeightedAverages(collections);
    const totalAmount = collections.reduce((acc, curr) => acc + curr.amount, 0);
    const count = collections.length;

    // Shift wise breakdown
    const morningCollections = collections.filter(c => c.shift === 'Morning');
    const eveningCollections = collections.filter(c => c.shift === 'Evening');

    const morningStats = calculateWeightedAverages(morningCollections);
    const eveningStats = calculateWeightedAverages(eveningCollections);

    // Raw Milk Inventory & Production Balance
    const procuredMilk = summaryStats.totalQty;
    const directSoldMilk = Math.round(directSales.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0) * 100) / 100;
    const usedInBatches = Math.round(productionBatches.reduce((acc, curr) => acc + (curr.milkQuantityUsed || 0), 0) * 100) / 100;
    const usedInConversions = Math.round(
      conversions
        .filter(c => c.inputUnit === 'Litre' || (c.inputMaterial && (c.inputMaterial.toLowerCase().includes('milk') || c.inputMaterial.toLowerCase().includes('दूध'))))
        .reduce((acc, curr) => acc + (curr.inputQuantity || 0), 0) * 100
    ) / 100;
    const usedInProduction = Math.round((usedInBatches + usedInConversions) * 100) / 100;
    const periodRemainingMilk = Math.max(0, Math.round((procuredMilk - usedInProduction - directSoldMilk) * 100) / 100);

    // All-time live tank stock
    const rawTankStock = inventoryDocs.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const liveTankStock = Math.max(0, Math.round(rawTankStock * 100) / 100);

    // Product stock map
    const productStockMap = {
      paneer: products.filter(p => p.category?.toLowerCase() === 'paneer').reduce((sum, p) => sum + (p.stockQty || 0), 0),
      ghee: products.filter(p => p.category?.toLowerCase() === 'ghee').reduce((sum, p) => sum + (p.stockQty || 0), 0),
      curd: products.filter(p => p.category?.toLowerCase() === 'curd').reduce((sum, p) => sum + (p.stockQty || 0), 0),
      cream: products.filter(p => p.category?.toLowerCase() === 'cream').reduce((sum, p) => sum + (p.stockQty || 0), 0),
      butter: products.filter(p => p.category?.toLowerCase() === 'butter').reduce((sum, p) => sum + (p.stockQty || 0), 0),
      khoya: products.filter(p => p.category?.toLowerCase() === 'khoya').reduce((sum, p) => sum + (p.stockQty || 0), 0),
    };

    res.json({
      overall: {
        totalQuantity: summaryStats.totalQty,
        avgFat: summaryStats.avgFat,
        avgSnf: summaryStats.avgSnf,
        totalCost: Math.round(totalAmount * 100) / 100,
        count
      },
      morning: {
        totalQuantity: morningStats.totalQty,
        avgFat: morningStats.avgFat,
        avgSnf: morningStats.avgSnf,
        totalCost: Math.round(morningCollections.reduce((acc, curr) => acc + curr.amount, 0) * 100) / 100,
        count: morningCollections.length
      },
      evening: {
        totalQuantity: eveningStats.totalQty,
        avgFat: eveningStats.avgFat,
        avgSnf: eveningStats.avgSnf,
        totalCost: Math.round(eveningCollections.reduce((acc, curr) => acc + curr.amount, 0) * 100) / 100,
        count: eveningCollections.length
      },
      inventory: {
        procuredMilk,
        usedInProduction,
        usedInBatches,
        usedInConversions,
        directSoldMilk,
        periodRemainingMilk,
        liveTankStock,
        productStocks: productStockMap,
        allProducts: products.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          stockQty: p.stockQty,
          sellingPrice: p.sellingPrice
        }))
      }
    });
  } catch (error) {
    console.error('Get Milk Summary Error:', error);
    res.status(500).json({ message: 'Error generating milk summary.' });
  }
};

export const createRateChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, effectiveDate, pricingType, cowRules, buffaloRules, mixedRules } = req.body;

    if (!name || !pricingType) {
      res.status(400).json({ message: 'Name and pricing type are required.' });
      return;
    }

    const chart = new MilkRateChart({
      tenantId: req.tenantId,
      name,
      effectiveDate: effectiveDate || new Date(),
      pricingType,
      cowRules: cowRules || [],
      buffaloRules: buffaloRules || [],
      mixedRules: mixedRules || []
    });

    await chart.save();
    res.status(201).json(chart);
  } catch (error) {
    console.error('Create Rate Chart Error:', error);
    res.status(500).json({ message: 'Error saving rate chart.' });
  }
};

export const getRateCharts = async (req: Request, res: Response): Promise<void> => {
  try {
    const charts = await MilkRateChart.find({ tenantId: req.tenantId }).sort({ effectiveDate: -1 });
    res.json(charts);
  } catch (error) {
    console.error('Get Rate Charts Error:', error);
    res.status(500).json({ message: 'Error retrieving rate charts.' });
  }
};
