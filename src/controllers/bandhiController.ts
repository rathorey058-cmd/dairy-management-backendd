import { Request, Response } from 'express';
import { MilkBandhi } from '../models/MilkBandhi';
import { BandhiDeliveryLog, IDeliveryItem } from '../models/BandhiDeliveryLog';
import { Customer } from '../models/Customer';
import { CustomerLedger } from '../models/CustomerLedger';
import { InventoryTransaction } from '../models/InventoryTransaction';

// Helper to seed sample bandhis for new tenants
export const ensureSampleBandhis = async (tenantId: any) => {
  const count = await MilkBandhi.countDocuments({ tenantId });
  if (count === 0) {
    const samples: Array<{
      bandhiNo: number;
      customerName: string;
      mobile: string;
      address: string;
      milkType: 'Cow' | 'Buffalo' | 'Mixed';
      shift: 'Morning' | 'Evening' | 'Both';
      dailyQuantity: number;
      rate: number;
      status: 'Active' | 'Paused';
    }> = [
      { bandhiNo: 1, customerName: 'Ramesh Sharma (शर्मा जी)', mobile: '9829011221', address: 'Plot 12, Gali 1', milkType: 'Buffalo', shift: 'Morning', dailyQuantity: 2.0, rate: 65, status: 'Active' },
      { bandhiNo: 2, customerName: 'Suresh Patel (पटेल हाउस)', mobile: '9829022332', address: 'House 45, Main Road', milkType: 'Buffalo', shift: 'Both', dailyQuantity: 1.5, rate: 65, status: 'Active' },
      { bandhiNo: 3, customerName: 'Dinesh Gupta (गुप्ता प्रोविजन)', mobile: '9829033443', address: 'Shop 4, Market', milkType: 'Cow', shift: 'Morning', dailyQuantity: 3.0, rate: 55, status: 'Active' },
      { bandhiNo: 4, customerName: 'Sunita Devi (वर्मा परिवार)', mobile: '9829044554', address: 'B-14, Shanti Nagar', milkType: 'Buffalo', shift: 'Morning', dailyQuantity: 1.0, rate: 65, status: 'Active' },
      { bandhiNo: 5, customerName: 'Mahesh Joshi (जोशी जी)', mobile: '9829055665', address: 'House 8, Mandir Marg', milkType: 'Buffalo', shift: 'Evening', dailyQuantity: 2.0, rate: 65, status: 'Active' },
      { bandhiNo: 6, customerName: 'Rajendra Singh (ठाकुर साहब)', mobile: '9829066776', address: 'Civil Lines 5', milkType: 'Buffalo', shift: 'Morning', dailyQuantity: 2.5, rate: 65, status: 'Active' },
      { bandhiNo: 7, customerName: 'Anil Agarwal (अग्रवाल स्वीट्स)', mobile: '9829077887', address: 'Near Bus Stand', milkType: 'Cow', shift: 'Morning', dailyQuantity: 4.0, rate: 55, status: 'Active' },
      { bandhiNo: 8, customerName: 'Mukesh Choudhary', mobile: '9829088998', address: 'Gali 9, Rampura', milkType: 'Buffalo', shift: 'Morning', dailyQuantity: 1.5, rate: 65, status: 'Active' },
    ];

    for (const s of samples) {
      // Create or find customer
      let cust = await Customer.findOne({ tenantId, mobile: s.mobile });
      if (!cust) {
        cust = await Customer.create({
          tenantId,
          name: s.customerName,
          mobile: s.mobile,
          address: s.address,
          creditLimit: 5000,
          outstandingBalance: 0,
        });
      }
      await MilkBandhi.create({
        tenantId,
        ...s,
        customer: cust._id,
      });
    }
  }
};

// 1. Get all Bandhis
export const getBandhis = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSampleBandhis((req as any).tenantId);
    const { status, shift, search } = req.query;
    const filter: any = { tenantId: (req as any).tenantId };

    if (status) filter.status = status;
    if (shift && shift !== 'All') {
      filter.$or = [{ shift }, { shift: 'Both' }];
    }
    if (search) {
      const searchNum = Number(search);
      if (!isNaN(searchNum)) {
        filter.$or = [{ bandhiNo: searchNum }, { customerName: new RegExp(String(search), 'i') }, { mobile: new RegExp(String(search), 'i') }];
      } else {
        filter.$or = [{ customerName: new RegExp(String(search), 'i') }, { mobile: new RegExp(String(search), 'i') }, { address: new RegExp(String(search), 'i') }];
      }
    }

    const bandhis = await MilkBandhi.find(filter).sort({ bandhiNo: 1 });
    res.json(bandhis);
  } catch (error) {
    console.error('Get Bandhis Error:', error);
    res.status(500).json({ message: 'बांधी सूची लोड करने में त्रुटि हुई।' });
  }
};

// 2. Create Bandhi
export const createBandhi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bandhiNo, customerName, mobile, address, area, milkType, shift, dailyQuantity, rate, notes } = req.body;

    if (!customerName || !mobile || !dailyQuantity || !rate) {
      res.status(400).json({ message: 'ग्राहक नाम, मोबाइल, दूध मात्रा और भाव आवश्यक हैं।' });
      return;
    }

    // Determine bandhiNo if not provided
    let assignedNo = Number(bandhiNo);
    if (!assignedNo || assignedNo <= 0) {
      const lastBandhi = await MilkBandhi.findOne({ tenantId: (req as any).tenantId }).sort({ bandhiNo: -1 });
      assignedNo = lastBandhi ? lastBandhi.bandhiNo + 1 : 1;
    }

    // Check duplicate bandhiNo
    const existing = await MilkBandhi.findOne({ tenantId: (req as any).tenantId, bandhiNo: assignedNo });
    if (existing) {
      res.status(400).json({ message: `बांधी नंबर ${assignedNo} पहले से दर्ज है। कृपया दूसरा नंबर चुनें।` });
      return;
    }

    // Find or create customer
    let cust = await Customer.findOne({ tenantId: (req as any).tenantId, mobile: mobile.trim() });
    if (!cust) {
      cust = await Customer.create({
        tenantId: (req as any).tenantId,
        name: customerName.trim(),
        mobile: mobile.trim(),
        address: address || '',
        area: area || '',
        creditLimit: 5000,
        outstandingBalance: 0,
      });
    }

    const bandhi = new MilkBandhi({
      tenantId: (req as any).tenantId,
      bandhiNo: assignedNo,
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      address: address || '',
      area: area || '',
      milkType: milkType || 'Buffalo',
      shift: shift || 'Morning',
      dailyQuantity: Number(dailyQuantity),
      rate: Number(rate),
      status: 'Active',
      customer: cust._id,
      notes: notes || '',
    });

    await bandhi.save();
    res.status(201).json(bandhi);
  } catch (error: any) {
    console.error('Create Bandhi Error:', error);
    res.status(500).json({ message: error.message || 'बांधी जोड़ने में त्रुटि हुई।' });
  }
};

// 3. Update Bandhi
export const updateBandhi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bandhi = await MilkBandhi.findOneAndUpdate(
      { _id: id, tenantId: (req as any).tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!bandhi) {
      res.status(404).json({ message: 'बांधी रिकॉर्ड नहीं मिला।' });
      return;
    }
    res.json(bandhi);
  } catch (error) {
    console.error('Update Bandhi Error:', error);
    res.status(500).json({ message: 'बांधी अपडेट करने में त्रुटि हुई।' });
  }
};

// 4. Get Daily Delivery Sheet
export const getDailyDeliverySheet = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSampleBandhis((req as any).tenantId);
    const { date, shift = 'Morning' } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let log = await BandhiDeliveryLog.findOne({
      tenantId: (req as any).tenantId,
      date: targetDate,
      shift: shift as any,
    });

    // If log exists, return it
    if (log) {
      res.json(log);
      return;
    }

    // Auto-generate fresh sheet from active bandhis for this shift
    const bandhiFilter: any = {
      tenantId: (req as any).tenantId,
      status: 'Active',
      $or: [{ shift: shift as string }, { shift: 'Both' }],
    };

    const activeBandhis = await MilkBandhi.find(bandhiFilter).sort({ bandhiNo: 1 });

    const deliveries: IDeliveryItem[] = activeBandhis.map((b) => {
      const standardQty = b.dailyQuantity;
      const rate = b.rate;
      const amount = Math.round(standardQty * rate * 100) / 100;
      return {
        bandhi: b._id as any,
        bandhiNo: b.bandhiNo,
        customerName: b.customerName,
        customer: b.customer,
        milkType: b.milkType,
        standardQuantity: standardQty,
        deliveredQuantity: standardQty,
        rate,
        amount,
        status: 'DELIVERED',
        notes: '',
      };
    });

    const totalMilkDelivered = Math.round(deliveries.reduce((sum, d) => sum + d.deliveredQuantity, 0) * 100) / 100;
    const totalAmount = Math.round(deliveries.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;

    res.json({
      tenantId: (req as any).tenantId,
      date: targetDate,
      shift,
      deliveries,
      totalMilkDelivered,
      totalAmount,
      deliveredCount: deliveries.length,
      skippedCount: 0,
      isConfirmed: false,
    });
  } catch (error) {
    console.error('Get Delivery Sheet Error:', error);
    res.status(500).json({ message: 'दैनिक डिलीवरी शीट लोड करने में त्रुटि हुई।' });
  }
};

// 5. Save / Confirm Daily Delivery Sheet
export const saveDailyDeliverySheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, shift = 'Morning', deliveries } = req.body;

    if (!deliveries || !Array.isArray(deliveries)) {
      res.status(400).json({ message: 'वितरण सूची (deliveries) आवश्यक है।' });
      return;
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let deliveredCount = 0;
    let skippedCount = 0;
    let totalMilkDelivered = 0;
    let totalAmount = 0;

    const cleanedDeliveries: IDeliveryItem[] = [];

    for (const d of deliveries) {
      const isSkipped = d.status === 'SKIPPED';
      const deliveredQty = isSkipped ? 0 : Number(d.deliveredQuantity) || Number(d.standardQuantity) || 0;
      const rate = Number(d.rate) || 60;
      const amount = isSkipped ? 0 : Math.round(deliveredQty * rate * 100) / 100;

      if (isSkipped) skippedCount++;
      else {
        deliveredCount++;
        totalMilkDelivered += deliveredQty;
        totalAmount += amount;
      }

      cleanedDeliveries.push({
        bandhi: d.bandhi,
        bandhiNo: d.bandhiNo,
        customerName: d.customerName,
        customer: d.customer,
        milkType: d.milkType || 'Buffalo',
        standardQuantity: Number(d.standardQuantity) || deliveredQty,
        deliveredQuantity: deliveredQty,
        rate,
        amount,
        status: isSkipped ? 'SKIPPED' : d.status === 'EXTRA' ? 'EXTRA' : 'DELIVERED',
        notes: d.notes || (isSkipped ? 'नागा / छुट्टी' : ''),
      });
    }

    totalMilkDelivered = Math.round(totalMilkDelivered * 100) / 100;
    totalAmount = Math.round(totalAmount * 100) / 100;

    // 1. Save or Update BandhiDeliveryLog
    const log = await BandhiDeliveryLog.findOneAndUpdate(
      { tenantId: (req as any).tenantId, date: targetDate, shift },
      {
        tenantId: (req as any).tenantId,
        date: targetDate,
        shift,
        deliveries: cleanedDeliveries,
        totalMilkDelivered,
        totalAmount,
        deliveredCount,
        skippedCount,
        isConfirmed: true,
        recordedBy: (req as any).user?.id || (req as any).userId,
      },
      { new: true, upsert: true }
    );

    // 2. Post charges to Customer Ledgers & Update Outstanding Balances
    for (const d of cleanedDeliveries) {
      if (d.status !== 'SKIPPED' && d.amount > 0) {
        // Find customer
        let custId = d.customer;
        if (!custId) {
          const bandhiDoc = await MilkBandhi.findById(d.bandhi);
          custId = bandhiDoc?.customer;
        }

        if (custId) {
          const cust = await Customer.findOne({ _id: custId, tenantId: (req as any).tenantId });
          if (cust) {
            cust.outstandingBalance = Math.round((cust.outstandingBalance + d.amount) * 100) / 100;
            await cust.save();

            // Post Customer Ledger Entry (INVOICE)
            await CustomerLedger.create({
              tenantId: (req as any).tenantId,
              customer: cust._id,
              date: targetDate,
              description: `दैनिक दूध बांधी #${d.bandhiNo} (${shift}): ${d.deliveredQuantity}L @ ₹${d.rate}/L`,
              type: 'INVOICE',
              amount: d.amount,
              balance: cust.outstandingBalance,
              referenceId: log._id,
            });
          }
        }
      }
    }

    // 3. Debit Raw Milk Inventory for delivered milk
    if (totalMilkDelivered > 0) {
      // Remove any prior inventory transaction for this specific delivery log
      await InventoryTransaction.deleteMany({ tenantId: (req as any).tenantId, referenceId: log._id });

      await InventoryTransaction.create({
        tenantId: (req as any).tenantId,
        isRawMilk: true,
        type: 'Sales',
        quantity: -totalMilkDelivered,
        date: targetDate,
        referenceId: log._id,
        notes: `दूध बांधी वितरण (${shift}): कुल ${totalMilkDelivered}L (${deliveredCount} घर)`,
      });
    }

    res.json({
      message: `दूध बांधी शीट सफलतापूर्वक सेव हो गयी! कुल ${deliveredCount} घरों में ${totalMilkDelivered}L दूध वितरित हुआ।`,
      log,
    });
  } catch (error: any) {
    console.error('Save Delivery Sheet Error:', error);
    res.status(500).json({ message: error.message || 'वितरण शीट सेव करने में त्रुटि हुई।' });
  }
};
