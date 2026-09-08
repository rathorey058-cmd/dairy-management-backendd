import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ProductionRecipe } from '../models/ProductionRecipe';
import { ProductionBatch } from '../models/ProductionBatch';
import { Product } from '../models/Product';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { MilkCollection } from '../models/MilkCollection';
import { MilkSale } from '../models/MilkSale';
import { MaterialConversion } from '../models/MaterialConversion';

export const getRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    let recipe = await ProductionRecipe.findOne({ product: productId, tenantId: req.tenantId });
    
    if (!recipe) {
      // Create a default recipe if none exists
      recipe = new ProductionRecipe({
        tenantId: req.tenantId,
        product: productId,
        baselineYieldPercent: 18,
        minExpectedYieldPercent: 15,
        maxExpectedYieldPercent: 22,
        fatRelationship: 2.0,
        snfRelationship: 1.0,
        processingCostPerUnit: 15,
        packagingCostPerUnit: 5
      });
      await recipe.save();
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Get Recipe Error:', error);
    res.status(500).json({ message: 'Error retrieving recipe.' });
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { 
      baselineYieldPercent, minExpectedYieldPercent, maxExpectedYieldPercent,
      fatRelationship, snfRelationship, processingCostPerUnit, packagingCostPerUnit, notes 
    } = req.body;

    const recipe = await ProductionRecipe.findOneAndUpdate(
      { product: productId, tenantId: req.tenantId },
      { 
        baselineYieldPercent, minExpectedYieldPercent, maxExpectedYieldPercent,
        fatRelationship, snfRelationship, processingCostPerUnit, packagingCostPerUnit, notes 
      },
      { new: true, upsert: true }
    );

    res.json(recipe);
  } catch (error) {
    console.error('Update Recipe Error:', error);
    res.status(500).json({ message: 'Error updating recipe.' });
  }
};

export const estimateYield = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, milkQuantity, fat, snf } = req.body;

    if (!productId || !milkQuantity || !fat || !snf) {
      res.status(400).json({ message: 'Product, milk quantity, FAT and SNF are required.' });
      return;
    }

    const recipe = await ProductionRecipe.findOne({ product: productId, tenantId: req.tenantId });
    if (!recipe) {
      res.status(404).json({ message: 'Production recipe not configured for this product.' });
      return;
    }

    // Smart Yield calculation
    // Base reference: FAT 4.0, SNF 8.5
    const baseFat = 4.0;
    const baseSnf = 8.5;
    const fatDiff = fat - baseFat;
    const snfDiff = snf - baseSnf;

    let predictedYieldPercent = recipe.baselineYieldPercent + 
      (fatDiff * recipe.fatRelationship) + 
      (snfDiff * recipe.snfRelationship);

    // Apply learning from history (7-day actual variance modifier)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBatches = await ProductionBatch.find({
      tenantId: req.tenantId,
      product: productId,
      status: 'Completed',
      date: { $gte: sevenDaysAgo }
    }).limit(10);

    let varianceModifier = 0;
    if (recentBatches.length > 0) {
      let totalVariancePercent = 0;
      for (const b of recentBatches) {
        // Calculate variance of yield percent vs prediction
        const basePrediction = recipe.baselineYieldPercent + ((b.avgFat - baseFat) * recipe.fatRelationship) + ((b.avgSnf - baseSnf) * recipe.snfRelationship);
        const actualYieldPercent = b.yieldPercent || 0;
        totalVariancePercent += (actualYieldPercent - basePrediction);
      }
      varianceModifier = totalVariancePercent / recentBatches.length;
    }

    // Final adjusted prediction
    const finalYieldPercent = predictedYieldPercent + varianceModifier;
    const expectedOutput = (milkQuantity * finalYieldPercent) / 100;
    const expectedMin = expectedOutput * 0.96; // 4% range buffer
    const expectedMax = expectedOutput * 1.04;

    res.json({
      expectedOutput: Math.round(expectedOutput * 100) / 100,
      expectedRangeMin: Math.round(expectedMin * 100) / 100,
      expectedRangeMax: Math.round(expectedMax * 100) / 100,
      yieldPercentEstimate: Math.round(finalYieldPercent * 100) / 100,
      historicalAdjustmentApplied: Math.round(varianceModifier * 100) / 100
    });
  } catch (error) {
    console.error('Estimate Yield Error:', error);
    res.status(500).json({ message: 'Error estimating yield.' });
  }
};

export const createBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, milkQuantityUsed, avgFat, avgSnf, notes } = req.body;

    if (!productId || !milkQuantityUsed || !avgFat || !avgSnf) {
      res.status(400).json({ message: 'Product, milk quantity, FAT and SNF are required.' });
      return;
    }

    // 1. Calculate Raw Milk stock from Inventory transactions
    const inventory = await InventoryTransaction.find({
      tenantId: req.tenantId,
      isRawMilk: true
    });
    const currentRawMilkStock = inventory.reduce((acc, curr) => acc + curr.quantity, 0);

    if (milkQuantityUsed > currentRawMilkStock) {
      res.status(400).json({
        message: `Insufficient raw milk stock. Available: ${currentRawMilkStock}L, Requested: ${milkQuantityUsed}L`
      });
      return;
    }

    // 2. Fetch recipe to compute expected output
    const recipe = await ProductionRecipe.findOne({ product: productId, tenantId: req.tenantId });
    if (!recipe) {
      res.status(404).json({ message: 'Production recipe not found.' });
      return;
    }

    const baseFat = 4.0;
    const baseSnf = 8.5;
    const expectedYieldPercent = recipe.baselineYieldPercent + 
      ((avgFat - baseFat) * recipe.fatRelationship) + 
      ((avgSnf - baseSnf) * recipe.snfRelationship);
    
    const expectedOutput = Math.round(((milkQuantityUsed * expectedYieldPercent) / 100) * 100) / 100;

    // 3. Generate batch number (PB-YYYYMMDD-01)
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const batchCount = await ProductionBatch.countDocuments({
      tenantId: req.tenantId,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    const batchNumber = `PB-${todayStr}-${String(batchCount + 1).padStart(2, '0')}`;

    // 4. Calculate raw milk cost based on average purchase rate today
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);
    
    const collectionsToday = await MilkCollection.find({
      tenantId: req.tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const avgPurchaseRate = collectionsToday.length > 0
      ? (collectionsToday.reduce((acc, curr) => acc + curr.amount, 0) / collectionsToday.reduce((acc, curr) => acc + curr.quantity, 0))
      : 45; // Default fallback to Rs 45/L

    const rawMilkCost = Math.round((milkQuantityUsed * avgPurchaseRate) * 100) / 100;

    // 5. Create Batch
    const batch = new ProductionBatch({
      tenantId: req.tenantId,
      batchNumber,
      date: new Date(),
      product: productId,
      milkQuantityUsed,
      avgFat,
      avgSnf,
      expectedOutput,
      processingCost: 0,
      packagingCost: 0,
      otherCost: 0,
      totalBatchCost: rawMilkCost, // initially just milk cost
      operator: req.user?.id,
      status: 'InProgress',
      notes
    });

    await batch.save();

    // 6. Debit Raw Milk Inventory
    await InventoryTransaction.create({
      tenantId: req.tenantId,
      isRawMilk: true,
      type: 'Production_Out',
      quantity: -milkQuantityUsed,
      date: new Date(),
      referenceId: batch._id,
      notes: `Production Batch ${batchNumber} started`
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error('Create Batch Error:', error);
    res.status(500).json({ message: 'Error starting production batch.' });
  }
};

export const completeBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actualOutput, processingCost, packagingCost, otherCost, notes } = req.body;

    if (actualOutput === undefined || actualOutput <= 0) {
      res.status(400).json({ message: 'Valid actual output is required to complete batch.' });
      return;
    }

    const batch = await ProductionBatch.findOne({ _id: id, tenantId: req.tenantId });
    if (!batch) {
      res.status(404).json({ message: 'Production batch not found.' });
      return;
    }

    if (batch.status !== 'InProgress') {
      res.status(400).json({ message: 'Only In-Progress batches can be completed.' });
      return;
    }

    // Complete batch calculations
    const variance = Math.round((actualOutput - batch.expectedOutput) * 100) / 100;
    const yieldPercent = Math.round((actualOutput / batch.milkQuantityUsed * 100) * 100) / 100;

    // Costing calculations
    // totalBatchCost = initial rawMilkCost (stored in totalBatchCost on creation) + new costs
    const rawMilkCost = batch.totalBatchCost;
    const totalBatchCost = Math.round((rawMilkCost + (processingCost || 0) + (packagingCost || 0) + (otherCost || 0)) * 100) / 100;
    const costPerUnit = Math.round((totalBatchCost / actualOutput) * 100) / 100;

    batch.actualOutput = actualOutput;
    batch.variance = variance;
    batch.yieldPercent = yieldPercent;
    batch.processingCost = processingCost || 0;
    batch.packagingCost = packagingCost || 0;
    batch.otherCost = otherCost || 0;
    batch.totalBatchCost = totalBatchCost;
    batch.costPerUnit = costPerUnit;
    batch.status = 'Completed';
    if (notes) batch.notes = notes;

    await batch.save();

    // Credit Finished Product Stock
    await InventoryTransaction.create({
      tenantId: req.tenantId,
      product: batch.product,
      isRawMilk: false,
      type: 'Production_In',
      quantity: actualOutput,
      date: new Date(),
      referenceId: batch._id,
      notes: `Batch ${batch.batchNumber} completed`
    });

    // Update Product Stock and Cost Price
    const product = await Product.findOne({ _id: batch.product, tenantId: req.tenantId });
    if (product) {
      product.stockQty = Math.round((product.stockQty + actualOutput) * 100) / 100;
      product.costPrice = costPerUnit; // update dynamic costing price
      await product.save();
    }

    res.json(batch);
  } catch (error) {
    console.error('Complete Batch Error:', error);
    res.status(500).json({ message: 'Error completing production batch.' });
  }
};

export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const batches = await ProductionBatch.find({ tenantId: req.tenantId })
      .populate('product', 'name unit sellingPrice costPrice')
      .populate('operator', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json(batches);
  } catch (error) {
    console.error('Get Batches Error:', error);
    res.status(500).json({ message: 'Error retrieving batches.' });
  }
};

export const getYieldStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const completedBatches = await ProductionBatch.find({
      tenantId: req.tenantId,
      product: productId,
      status: 'Completed'
    }).sort({ date: -1 });

    if (completedBatches.length === 0) {
      res.json({
        hasHistory: false,
        message: 'No completed production history for this product.'
      });
      return;
    }

    const yields = completedBatches.map(b => b.yieldPercent || 0);
    const avgYield = yields.reduce((acc, curr) => acc + curr, 0) / yields.length;
    const bestYield = Math.max(...yields);
    const worstYield = Math.min(...yields);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysBatches = completedBatches.filter(b => b.date >= sevenDaysAgo);
    const avgYield7Days = last7DaysBatches.length > 0
      ? last7DaysBatches.reduce((acc, curr) => acc + (curr.yieldPercent || 0), 0) / last7DaysBatches.length
      : avgYield;

    res.json({
      hasHistory: true,
      totalBatches: completedBatches.length,
      averageYieldPercent: Math.round(avgYield * 100) / 100,
      averageYield7DaysPercent: Math.round(avgYield7Days * 100) / 100,
      bestYieldPercent: Math.round(bestYield * 100) / 100,
      worstYieldPercent: Math.round(worstYield * 100) / 100,
      history: completedBatches.slice(0, 10).map(b => ({
        batchNumber: b.batchNumber,
        date: b.date,
        fat: b.avgFat,
        snf: b.avgSnf,
        yieldPercent: b.yieldPercent,
        variance: b.variance
      }))
    });
  } catch (error) {
    console.error('Get Yield Stats Error:', error);
    res.status(500).json({ message: 'Error loading yield metrics.' });
  }
};

// 1. Live Stock Status (Milk in Tank, Cream, Ghee, Paneer, Curd/Lassi)
export const getLiveStockStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // A. Milk Calculations Today
    const [collectionsToday, directMilkSalesToday, conversionsToday] = await Promise.all([
      MilkCollection.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } }),
      MilkSale.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } }),
      MaterialConversion.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } })
    ]);

    const totalProcuredMilk = collectionsToday.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const totalDirectMilkSold = directMilkSalesToday.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);
    
    // Milk used in conversions today
    const milkUsedInProcessing = conversionsToday
      .filter(c => c.inputUnit === 'Litre' || c.inputMaterial.toLowerCase().includes('milk') || c.inputMaterial.toLowerCase().includes('दूध'))
      .reduce((sum, c) => sum + (c.inputQuantity || 0), 0);

    const liveMilkStock = Math.max(0, Math.round((totalProcuredMilk - totalDirectMilkSold - milkUsedInProcessing) * 10) / 10);

    // B. Products by Category (Ghee, Cream, Paneer, Curd/Lassi, Butter, Khoya)
    const products = await Product.find({ tenantId: req.tenantId });

    const getStockForCategory = (cat: string) => {
      const prods = products.filter(p => p.category.toLowerCase() === cat.toLowerCase());
      return prods.reduce((sum, p) => sum + (p.stockQty || 0), 0);
    };

    const creamStock = getStockForCategory('Cream');
    const gheeStock = getStockForCategory('Ghee');
    const paneerStock = getStockForCategory('Paneer');
    const curdStock = getStockForCategory('Curd');
    const butterStock = getStockForCategory('Butter');
    const khoyaStock = getStockForCategory('Khoya');

    res.json({
      milk: {
        currentStock: liveMilkStock,
        procuredToday: Math.round(totalProcuredMilk * 10) / 10,
        directSoldToday: Math.round(totalDirectMilkSold * 10) / 10,
        processedToday: Math.round(milkUsedInProcessing * 10) / 10,
        unit: 'Litre'
      },
      cream: { currentStock: creamStock, unit: 'KG' },
      ghee: { currentStock: gheeStock, unit: 'KG' },
      paneer: { currentStock: paneerStock, unit: 'KG' },
      curd: { currentStock: curdStock, unit: 'Litre' },
      butter: { currentStock: butterStock, unit: 'KG' },
      khoya: { currentStock: khoyaStock, unit: 'KG' },
      allProducts: products
    });
  } catch (error) {
    console.error('Get Live Stock Status Error:', error);
    res.status(500).json({ message: 'Error retrieving live stock status.' });
  }
};

// 2. Record Material Conversion (Cream -> Ghee, Milk -> Paneer, Milk -> Lassi, etc.)
export const recordConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      conversionType, 
      date, 
      inputMaterial, 
      inputQuantity, 
      inputUnit, 
      outputProduct, 
      outputQuantity, 
      outputUnit, 
      byProduct, 
      notes 
    } = req.body;

    const inQty = Number(inputQuantity) || 0;
    const outQty = Number(outputQuantity) || 0;

    if (inQty <= 0 || outQty <= 0) {
      res.status(400).json({ message: 'Please enter valid input and output quantities.' });
      return;
    }

    const yieldPercent = Math.round((outQty / inQty) * 10000) / 100;

    const conversion = new MaterialConversion({
      tenantId: req.tenantId,
      conversionType: conversionType || 'CUSTOM',
      date: date ? new Date(date) : new Date(),
      inputMaterial: inputMaterial || 'Raw Material',
      inputQuantity: inQty,
      inputUnit: inputUnit || 'KG',
      outputProduct: outputProduct || 'Finished Product',
      outputQuantity: outQty,
      outputUnit: outputUnit || 'KG',
      yieldPercent,
      byProduct,
      notes,
      operator: (req as any).userId || (req as any).user?._id
    });

    await conversion.save();

    const conversionDate = conversion.date || new Date();

    // 1. If Milk was used as input, debit Raw Milk Inventory
    const isMilkInput = inputMaterial.toLowerCase().includes('milk') || 
      inputMaterial.toLowerCase().includes('दूध') || 
      conversionType.startsWith('MILK_') || 
      inputUnit === 'Litre';

    if (isMilkInput) {
      await InventoryTransaction.create({
        tenantId: req.tenantId,
        isRawMilk: true,
        type: 'Production_Out',
        quantity: -inQty,
        date: conversionDate,
        referenceId: conversion._id,
        notes: `Conversion: ${inQty}L Milk -> ${outQty} ${outputUnit} ${outputProduct}`
      });
    }

    // 2. Auto-update Product Stocks & Inventory Transactions
    const categoryMap: Record<string, string> = {
      CREAM_TO_GHEE: 'Ghee',
      MILK_TO_PANEER: 'Paneer',
      MILK_TO_LASSI: 'Curd',
      MILK_TO_CURD: 'Curd',
      MILK_TO_CREAM: 'Cream',
      MILK_TO_KHOYA: 'Khoya'
    };

    if (conversionType === 'CREAM_TO_GHEE') {
      await Product.findOneAndUpdate(
        { tenantId: req.tenantId, category: 'Cream' },
        { $inc: { stockQty: -inQty } }
      );
      const gheeProd = await Product.findOneAndUpdate(
        { tenantId: req.tenantId, category: 'Ghee' },
        { $inc: { stockQty: outQty } },
        { new: true }
      );
      if (gheeProd) {
        await InventoryTransaction.create({
          tenantId: req.tenantId,
          product: gheeProd._id,
          isRawMilk: false,
          type: 'Production_In',
          quantity: outQty,
          date: conversionDate,
          referenceId: conversion._id,
          notes: `Ghee production from ${inQty}kg Cream`
        });
      }
    } else {
      const targetCategory = categoryMap[conversionType] || outputProduct;
      let prod = await Product.findOne({ tenantId: req.tenantId, category: targetCategory });
      if (!prod) {
        prod = await Product.create({
          tenantId: req.tenantId,
          name: outputProduct || targetCategory,
          category: targetCategory,
          unit: outputUnit || (targetCategory === 'Curd' ? 'Litre' : 'KG'),
          sellingPrice: targetCategory === 'Paneer' ? 360 : targetCategory === 'Ghee' ? 720 : targetCategory === 'Cream' ? 380 : 60,
          costPrice: targetCategory === 'Paneer' ? 260 : targetCategory === 'Ghee' ? 550 : targetCategory === 'Cream' ? 280 : 45,
          stockQty: outQty
        });
      } else {
        prod.stockQty = Math.round((prod.stockQty + outQty) * 100) / 100;
        await prod.save();
      }

      await InventoryTransaction.create({
        tenantId: req.tenantId,
        product: prod._id,
        isRawMilk: false,
        type: 'Production_In',
        quantity: outQty,
        date: conversionDate,
        referenceId: conversion._id,
        notes: `Production conversion: +${outQty} ${outputUnit} ${outputProduct}`
      });
    }

    res.status(201).json(conversion);
  } catch (error) {
    console.error('Record Conversion Error:', error);
    res.status(500).json({ message: 'Failed to record material conversion.' });
  }
};

// 3. Get Conversion History
export const getConversionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, conversionType } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (conversionType) {
      filter.conversionType = conversionType;
    }

    if (startDate || endDate) {
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

    const logs = await MaterialConversion.find(filter)
      .populate('operator', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.json(logs);
  } catch (error) {
    console.error('Get Conversion History Error:', error);
    res.status(500).json({ message: 'Error fetching conversion history.' });
  }
};

// 4. Adjust / Set Product Stock manually
export const adjustProductStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, newStock, category, changeNotes } = req.body;

    let targetProduct = null;
    if (productId) {
      targetProduct = await Product.findOne({ _id: productId, tenantId: req.tenantId });
    } else if (category) {
      targetProduct = await Product.findOne({ category, tenantId: req.tenantId });
      if (!targetProduct) {
        // Create if doesn't exist
        targetProduct = new Product({
          tenantId: req.tenantId,
          name: category === 'Ghee' ? 'Desi Ghee' : category === 'Cream' ? 'Malai / Cream' : category,
          category,
          unit: category === 'Milk' || category === 'Curd' ? 'Litre' : 'KG',
          sellingPrice: category === 'Ghee' ? 720 : category === 'Cream' ? 380 : category === 'Paneer' ? 360 : 60,
          costPrice: category === 'Ghee' ? 550 : category === 'Cream' ? 280 : category === 'Paneer' ? 260 : 45,
          stockQty: Number(newStock) || 0
        });
      }
    }

    if (!targetProduct) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }

    targetProduct.stockQty = Math.max(0, Number(newStock) || 0);
    await targetProduct.save();

    res.json(targetProduct);
  } catch (error) {
    console.error('Adjust Stock Error:', error);
    res.status(500).json({ message: 'Failed to adjust stock.' });
  }
};
