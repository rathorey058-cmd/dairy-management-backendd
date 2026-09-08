import { Request, Response } from 'express';
import { MilkSale } from '../models/MilkSale';
import { CashTransaction } from '../models/CashTransaction';
import { InventoryTransaction } from '../models/InventoryTransaction';

export const createMilkSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      date, 
      shift, 
      superMilk, 
      regularMilk, 
      cowMilk, 
      paymentMode, 
      customerName, 
      notes 
    } = req.body;

    const superQty = Number(superMilk?.quantity) || 0;
    const superRate = Number(superMilk?.rate) || 68;
    const superAmt = Math.round(superQty * superRate * 100) / 100;

    const regQty = Number(regularMilk?.quantity) || 0;
    const regRate = Number(regularMilk?.rate) || 60;
    const regAmt = Math.round(regQty * regRate * 100) / 100;

    const cowQty = Number(cowMilk?.quantity) || 0;
    const cowRate = Number(cowMilk?.rate) || 55;
    const cowAmt = Math.round(cowQty * cowRate * 100) / 100;

    const totalQuantity = Math.round((superQty + regQty + cowQty) * 100) / 100;
    const totalAmount = Math.round((superAmt + regAmt + cowAmt) * 100) / 100;

    if (totalQuantity <= 0) {
      res.status(400).json({ message: 'Please enter a valid quantity for at least one milk variant.' });
      return;
    }

    const saleDate = date ? new Date(date) : new Date();

    const milkSale = new MilkSale({
      tenantId: req.tenantId,
      date: saleDate,
      shift: shift || 'Morning',
      superMilk: { quantity: superQty, rate: superRate, amount: superAmt },
      regularMilk: { quantity: regQty, rate: regRate, amount: regAmt },
      cowMilk: { quantity: cowQty, rate: cowRate, amount: cowAmt },
      totalQuantity,
      totalAmount,
      paymentMode: paymentMode || 'Cash',
      customerName: customerName || 'Counter Buyers',
      notes,
      recordedBy: (req as any).userId || (req as any).user?._id
    });

    await milkSale.save();

    // 1. Debit Raw Milk inventory for direct milk sale
    await InventoryTransaction.create({
      tenantId: req.tenantId,
      isRawMilk: true,
      type: 'Sales',
      quantity: -totalQuantity,
      date: saleDate,
      referenceId: milkSale._id,
      notes: `Direct Milk Sale (${shift || 'Morning'}) - Total ${totalQuantity}L`
    });

    // 2. If payment is in Cash, log CashTransaction so Galla reconciles immediately
    if (paymentMode === 'Cash' || !paymentMode) {
      await CashTransaction.create({
        tenantId: req.tenantId,
        date: saleDate,
        amount: totalAmount,
        type: 'CASH_SALE',
        description: `Direct Milk Sale (${shift || 'Morning'}): ${superQty > 0 ? `Super ${superQty}L ` : ''}${regQty > 0 ? `Regular ${regQty}L ` : ''}${cowQty > 0 ? `Cow ${cowQty}L` : ''}`.trim(),
        referenceId: milkSale._id
      });
    }

    res.status(201).json(milkSale);
  } catch (error) {
    console.error('Create Milk Sale Error:', error);
    res.status(500).json({ message: 'Failed to record direct milk sale.' });
  }
};

export const getMilkSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startDate, endDate, shift } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (shift) {
      filter.shift = shift;
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

    const sales = await MilkSale.find(filter)
      .populate('recordedBy', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.json(sales);
  } catch (error) {
    console.error('Get Milk Sales Error:', error);
    res.status(500).json({ message: 'Failed to fetch milk sales.' });
  }
};

export const getMilkSaleSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startDate, endDate } = req.query;
    const filter: any = { tenantId: req.tenantId };

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

    const sales = await MilkSale.find(filter);

    const summary = {
      totalSuperQty: sales.reduce((sum, s) => sum + (s.superMilk?.quantity || 0), 0),
      totalSuperAmount: sales.reduce((sum, s) => sum + (s.superMilk?.amount || 0), 0),
      totalRegularQty: sales.reduce((sum, s) => sum + (s.regularMilk?.quantity || 0), 0),
      totalRegularAmount: sales.reduce((sum, s) => sum + (s.regularMilk?.amount || 0), 0),
      totalCowQty: sales.reduce((sum, s) => sum + (s.cowMilk?.quantity || 0), 0),
      totalCowAmount: sales.reduce((sum, s) => sum + (s.cowMilk?.amount || 0), 0),
      totalQuantity: sales.reduce((sum, s) => sum + (s.totalQuantity || 0), 0),
      totalAmount: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      count: sales.length
    };

    res.json(summary);
  } catch (error) {
    console.error('Get Milk Sale Summary Error:', error);
    res.status(500).json({ message: 'Failed to aggregate milk sales.' });
  }
};
