import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { DailyClosing } from '../models/DailyClosing';
import { MilkCollection } from '../models/MilkCollection';
import { Order } from '../models/Order';
import { Expense } from '../models/Expense';
import { CashTransaction } from '../models/CashTransaction';
import { Product } from '../models/Product';

export const closeDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, actualGalla, notes } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 1. Calculate Milk collections summary
    const collections = await MilkCollection.find({
      tenantId: req.tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const milkQuantity = collections.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalMilkAmt = collections.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Weighted FAT/SNF pool averages
    let avgFat = 0;
    let avgSnf = 0;
    if (milkQuantity > 0) {
      avgFat = collections.reduce((acc, curr) => acc + ((curr.fat || 0) * curr.quantity), 0) / milkQuantity;
      avgSnf = collections.reduce((acc, curr) => acc + ((curr.snf || 0) * curr.quantity), 0) / milkQuantity;
    }

    // 2. Sales summary
    const sales = await Order.find({
      tenantId: req.tenantId,
      orderDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'Cancelled' }
    });

    const totalSales = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const cashSales = sales.filter(s => s.paymentMode === 'Cash').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const creditSales = sales.filter(s => s.paymentMode === 'Credit').reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 3. Expenses summary
    const expensesList = await Expense.find({
      tenantId: req.tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    const expenses = expensesList.reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Farmer payments made in cash today
    const cashLogs = await CashTransaction.find({
      tenantId: req.tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    const farmerPayments = Math.abs(cashLogs.filter(t => t.type === 'FARMER_PAYMENT').reduce((acc, curr) => acc + curr.amount, 0));
    const collectionsCash = cashLogs.filter(t => t.type === 'CUSTOMER_COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);

    // 5. Expected Galla Cash
    // Opening Cash + cash sales + customer collection payments - farmer cash payments - cash expenses
    const lastClosing = await DailyClosing.findOne({ tenantId: req.tenantId, isClosed: true })
      .sort({ date: -1 });
    const openingCash = lastClosing ? lastClosing.summary.actualGalla : 10000;

    const expectedGalla = Math.round((openingCash + cashSales + collectionsCash - farmerPayments - expenses) * 100) / 100;
    const difference = Math.round((parseFloat(actualGalla) - expectedGalla) * 100) / 100;

    // 6. Expected vs Actual profits
    // Profit = Total sales - COGS - expenses
    let bookedCOGS = 0;
    for (const order of sales) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        const costPrice = product ? product.costPrice : (item.rate * 0.7);
        bookedCOGS += item.quantity * costPrice;
      }
    }

    const expectedProfit = Math.round((totalSales - bookedCOGS - expenses) * 100) / 100;

    // Create or update Closing entry
    const closing = await DailyClosing.findOneAndUpdate(
      { tenantId: req.tenantId, date: startOfDay },
      {
        tenantId: req.tenantId,
        date: startOfDay,
        closedBy: req.user?.id,
        isClosed: true,
        summary: {
          milkQuantity: Math.round(milkQuantity * 100) / 100,
          avgFat: Math.round(avgFat * 100) / 100,
          avgSnf: Math.round(avgSnf * 100) / 100,
          totalSales: Math.round(totalSales * 100) / 100,
          cashSales: Math.round(cashSales * 100) / 100,
          creditSales: Math.round(creditSales * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          farmerPayments: Math.round(farmerPayments * 100) / 100,
          expectedGalla,
          actualGalla: parseFloat(actualGalla),
          difference,
          expectedProfit,
          actualProfit: expectedProfit // for simplification in counter-sales
        }
      },
      { new: true, upsert: true }
    );

    res.json(closing);
  } catch (error) {
    console.error('Close Day Error:', error);
    res.status(500).json({ message: 'Error closing calendar day.' });
  }
};

export const getClosingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const closing = await DailyClosing.findOne({
      tenantId: req.tenantId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    res.json({ isClosed: closing ? closing.isClosed : false, closing });
  } catch (error) {
    console.error('Get Closing Status Error:', error);
    res.status(500).json({ message: 'Error fetching closing status.' });
  }
};

export const getDailyClosingHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const filter: any = { tenantId: req.tenantId };

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

    const closings = await DailyClosing.find(filter)
      .populate('closedBy', 'name')
      .sort({ date: -1 });

    res.json(closings);
  } catch (error) {
    console.error('Get Daily Closing History Error:', error);
    res.status(500).json({ message: 'Error retrieving closing history.' });
  }
};

export const generateDailyExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const dateStr = req.query.date as string;
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Gather statistics
    const [collections, sales, expenses, cashLogs, closing] = await Promise.all([
      MilkCollection.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } }).populate('farmer', 'name farmerId village'),
      Order.find({ tenantId: req.tenantId, orderDate: { $gte: startOfDay, $lte: endOfDay } }),
      Expense.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } }),
      CashTransaction.find({ tenantId: req.tenantId, date: { $gte: startOfDay, $lte: endOfDay } }),
      DailyClosing.findOne({ tenantId: req.tenantId, date: startOfDay })
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dairy Smart AI';
    workbook.created = new Date();

    // Tab 1: Overview
    const summarySheet = workbook.addWorksheet('Day Summary');
    summarySheet.columns = [
      { header: 'Metric Field', key: 'metric', width: 28 },
      { header: 'Value Summary', key: 'value', width: 22 }
    ];
    summarySheet.addRow({ metric: 'Report Calendar Date', value: startOfDay.toLocaleDateString() });
    summarySheet.addRow({ metric: 'Day Closing Lock Status', value: closing?.isClosed ? 'CLOSED & LOCKED' : 'OPEN' });
    summarySheet.addRow({});
    summarySheet.addRow({ metric: 'Expected Cash Galla', value: closing?.summary.expectedGalla || 0 });
    summarySheet.addRow({ metric: 'Actual Cash Logged', value: closing?.summary.actualGalla || 0 });
    summarySheet.addRow({ metric: 'Cash Discrepancy Margin', value: closing?.summary.difference || 0 });
    summarySheet.addRow({});
    summarySheet.addRow({ metric: 'Total Milk Pool Quantity (L)', value: closing?.summary.milkQuantity || 0 });
    summarySheet.addRow({ metric: 'Average Milk Pool FAT (%)', value: closing?.summary.avgFat || 0 });
    summarySheet.addRow({ metric: 'Average Milk Pool SNF (%)', value: closing?.summary.avgSnf || 0 });
    summarySheet.addRow({});
    summarySheet.addRow({ metric: 'Total Counter Sales (INR)', value: closing?.summary.totalSales || 0 });
    summarySheet.addRow({ metric: 'Net Shift Expected Profit', value: closing?.summary.expectedProfit || 0 });

    // Header styling for summary
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    // Tab 2: Collections
    const milkSheet = workbook.addWorksheet('Milk Collections');
    milkSheet.columns = [
      { header: 'Farmer ID', key: 'farmerId', width: 12 },
      { header: 'Farmer Name', key: 'name', width: 22 },
      { header: 'Milk Type', key: 'milkType', width: 12 },
      { header: 'Quantity (L)', key: 'qty', width: 14 },
      { header: 'FAT (%)', key: 'fat', width: 10 },
      { header: 'SNF (%)', key: 'snf', width: 10 },
      { header: 'Rate (₹/L)', key: 'rate', width: 12 },
      { header: 'Amount (₹)', key: 'amount', width: 16 }
    ];
    collections.forEach(c => {
      milkSheet.addRow({
        farmerId: (c.farmer as any)?.farmerId || 'N/A',
        name: (c.farmer as any)?.name || 'Guest',
        milkType: c.milkType,
        qty: c.quantity,
        fat: c.fat,
        snf: c.snf,
        rate: c.rate,
        amount: c.amount
      });
    });
    milkSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    milkSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    // Tab 3: Sales POS Invoices
    const salesSheet = workbook.addWorksheet('POS Sales');
    salesSheet.columns = [
      { header: 'Order Ref ID', key: 'orderId', width: 15 },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Total Value (₹)', key: 'total', width: 16 }
    ];
    sales.forEach(s => {
      salesSheet.addRow({
        orderId: s._id.toString().slice(-6).toUpperCase(),
        customer: s.customerName,
        paymentMode: s.paymentMode,
        total: s.totalAmount
      });
    });
    salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    // Send downloadable binary response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Dairy_Report_${startOfDay.toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({ message: 'Error generating excel daily report.' });
  }
};
