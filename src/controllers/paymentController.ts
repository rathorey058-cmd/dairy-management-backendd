import { Request, Response } from 'express';
import { Farmer } from '../models/Farmer';
import { FarmerAdvance } from '../models/FarmerAdvance';
import { FarmerPayment } from '../models/FarmerPayment';
import { FarmerSettlement } from '../models/FarmerSettlement';
import { FarmerLedger } from '../models/FarmerLedger';
import { postLedgerEntry } from '../services/milkService';

export const giveAdvance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId, amount, paymentMode, referenceNumber, notes } = req.body;

    if (!farmerId || !amount || !paymentMode) {
      res.status(400).json({ message: 'Farmer, amount and payment mode are required.' });
      return;
    }

    const farmer = await Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer not found.' });
      return;
    }

    const advance = new FarmerAdvance({
      tenantId: req.tenantId,
      farmer: farmerId,
      date: new Date(),
      amount,
      paymentMode,
      referenceNumber,
      remainingAdvance: amount,
      notes
    });

    await advance.save();

    // Deduct advance from ledger (reduces what we owe the farmer, so amount is negative)
    await postLedgerEntry(
      req.tenantId!.toString(),
      farmerId,
      new Date(),
      'ADVANCE_GIVEN',
      -amount,
      `Advance Paid to Farmer: ₹${amount} (${paymentMode})`,
      advance._id.toString()
    );

    res.status(201).json(advance);
  } catch (error) {
    console.error('Give Advance Error:', error);
    res.status(500).json({ message: 'Error booking farmer advance.' });
  }
};

export const makePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId, amount, paymentMode, referenceNumber, notes } = req.body;

    if (!farmerId || !amount || !paymentMode) {
      res.status(400).json({ message: 'Farmer, amount and payment mode are required.' });
      return;
    }

    const farmer = await Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer not found.' });
      return;
    }

    const payment = new FarmerPayment({
      tenantId: req.tenantId,
      farmer: farmerId,
      date: new Date(),
      amount,
      paymentMode,
      referenceNumber,
      notes
    });

    await payment.save();

    // Deduct payment from ledger (reduces what we owe the farmer, so amount is negative)
    await postLedgerEntry(
      req.tenantId!.toString(),
      farmerId,
      new Date(),
      'PAYMENT_MADE',
      -amount,
      `Payment made to Farmer: ₹${amount} (${paymentMode})`,
      payment._id.toString()
    );

    res.status(201).json(payment);
  } catch (error) {
    console.error('Make Payment Error:', error);
    res.status(500).json({ message: 'Error saving payment.' });
  }
};

export const settleAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId, amountPaid, paymentMode, referenceNumber, notes } = req.body;

    if (!farmerId || amountPaid === undefined || !paymentMode) {
      res.status(400).json({ message: 'Farmer, amount paid and payment mode are required.' });
      return;
    }

    const farmer = await Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer not found.' });
      return;
    }

    // Get current ledger balance
    const lastLedger = await FarmerLedger.findOne({ tenantId: req.tenantId, farmer: farmerId })
      .sort({ date: -1, createdAt: -1 });

    const currentBalance = lastLedger ? lastLedger.balance : 0;
    
    // Find all active advances
    const activeAdvances = await FarmerAdvance.find({
      tenantId: req.tenantId,
      farmer: farmerId,
      remainingAdvance: { $gt: 0 }
    }).sort({ date: 1 });

    const totalAdvanceOutstanding = activeAdvances.reduce((acc, curr) => acc + curr.remainingAdvance, 0);

    // Calculate settlement
    // If the dairy owes the farmer Rs 18,500 (currentBalance = 18,500)
    // and there is an outstanding advance of Rs 5,000.
    // We adjust the advance up to the outstanding balance.
    let advanceToAdjust = Math.min(currentBalance, totalAdvanceOutstanding);
    if (advanceToAdjust < 0) advanceToAdjust = 0;

    const netPayable = Math.round((currentBalance - advanceToAdjust) * 100) / 100;

    // Deduct remaining advance from advance sheets
    let remainingToAdjust = advanceToAdjust;
    for (const adv of activeAdvances) {
      if (remainingToAdjust <= 0) break;
      const adjustAmount = Math.min(adv.remainingAdvance, remainingToAdjust);
      adv.remainingAdvance = Math.round((adv.remainingAdvance - adjustAmount) * 100) / 100;
      await adv.save();
      remainingToAdjust -= adjustAmount;
    }

    const settlement = new FarmerSettlement({
      tenantId: req.tenantId,
      farmer: farmerId,
      date: new Date(),
      milkValue: currentBalance,
      advanceAdjusted: advanceToAdjust,
      alreadyPaid: 0, // already accounted in ledger balance
      netPayable,
      amountPaid,
      paymentMode,
      referenceNumber,
      notes
    });

    await settlement.save();

    // Adjust Ledger
    // 1. Write advance adjustment entry (reduces payable, so negative)
    if (advanceToAdjust > 0) {
      await postLedgerEntry(
        req.tenantId!.toString(),
        farmerId,
        new Date(),
        'ADJUSTMENT',
        -advanceToAdjust,
        `Settlement Advance Adjusted: -₹${advanceToAdjust}`,
        settlement._id.toString()
      );
    }

    // 2. Write settlement payment entry (reduces payable, so negative)
    if (amountPaid > 0) {
      await postLedgerEntry(
        req.tenantId!.toString(),
        farmerId,
        new Date(),
        'PAYMENT_MADE',
        -amountPaid,
        `Settlement Cash Paid: -₹${amountPaid} (${paymentMode})`,
        settlement._id.toString()
      );
    }

    res.status(201).json(settlement);
  } catch (error) {
    console.error('Settle Account Error:', error);
    res.status(500).json({ message: 'Error processing farmer settlement.' });
  }
};

export const getSettlementById = async (req: Request, res: Response): Promise<void> => {
  try {
    const settlement = await FarmerSettlement.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('farmer', 'farmerId name mobile village address');

    if (!settlement) {
      res.status(404).json({ message: 'Settlement receipt not found.' });
      return;
    }

    res.json(settlement);
  } catch (error) {
    console.error('Get Settlement Error:', error);
    res.status(500).json({ message: 'Error fetching settlement receipt.' });
  }
};
