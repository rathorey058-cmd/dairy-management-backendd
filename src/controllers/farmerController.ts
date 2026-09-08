import { Request, Response } from 'express';
import { Farmer } from '../models/Farmer';
import { FarmerLedger } from '../models/FarmerLedger';
import { MilkCollection } from '../models/MilkCollection';

export const getFarmers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, village, status } = req.query;
    const filter: any = { tenantId: req.tenantId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { farmerId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    if (village) {
      filter.village = village;
    }

    if (status) {
      filter.status = status;
    }

    const farmers = await Farmer.find(filter).sort({ farmerId: 1 });
    res.json(farmers);
  } catch (error) {
    console.error('Get Farmers Error:', error);
    res.status(500).json({ message: 'Error retrieving farmers.' });
  }
};

export const createFarmer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, mobile, village, address, bankAccount, ifsc, upi, openingBalance, openingAdvance, notes, fatRate } = req.body;

    if (!name || !mobile || !village) {
      res.status(400).json({ message: 'Name, mobile and village are required.' });
      return;
    }

    // Auto-generate farmerId based on current count
    const farmerCount = await Farmer.countDocuments({ tenantId: req.tenantId });
    const farmerId = `F-${String(farmerCount + 1).padStart(4, '0')}`;

    const farmer = new Farmer({
      tenantId: req.tenantId,
      farmerId,
      name,
      mobile,
      village,
      address,
      bankAccount,
      ifsc,
      upi,
      openingBalance: openingBalance || 0,
      openingAdvance: openingAdvance || 0,
      fatRate: fatRate || 0,
      notes
    });

    await farmer.save();

    // If opening balance exists, write to ledger
    if (openingBalance && openingBalance !== 0) {
      await FarmerLedger.create({
        tenantId: req.tenantId,
        farmer: farmer._id,
        date: new Date(),
        description: 'Opening Balance',
        transactionType: 'ADJUSTMENT',
        amount: openingBalance,
        balance: openingBalance,
        referenceId: farmer._id
      });
    }

    res.status(201).json(farmer);
  } catch (error) {
    console.error('Create Farmer Error:', error);
    res.status(500).json({ message: 'Error creating farmer.' });
  }
};

export const getFarmerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const farmer = await Farmer.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!farmer) {
      res.status(404).json({ message: 'Farmer not found.' });
      return;
    }
    res.json(farmer);
  } catch (error) {
    console.error('Get Farmer By ID Error:', error);
    res.status(500).json({ message: 'Error fetching farmer details.' });
  }
};

export const getFarmerLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const filter: any = { 
      tenantId: req.tenantId, 
      farmer: req.params.id 
    };

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

    const ledger = await FarmerLedger.find(filter).sort({ date: 1, createdAt: 1 });
    res.json(ledger);
  } catch (error) {
    console.error('Get Farmer Ledger Error:', error);
    res.status(500).json({ message: 'Error retrieving farmer ledger.' });
  }
};

export const getFarmerMilkHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;

    const history = await MilkCollection.find({ 
      tenantId: req.tenantId, 
      farmer: req.params.id 
    })
      .sort({ date: -1 })
      .limit(limitNum);

    res.json(history);
  } catch (error) {
    console.error('Get Farmer Milk History Error:', error);
    res.status(500).json({ message: 'Error retrieving milk history.' });
  }
};
