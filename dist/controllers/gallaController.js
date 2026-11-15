"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastGallaAndProfit = exports.getGallaStatus = void 0;
const CashTransaction_1 = require("../models/CashTransaction");
const DailyClosing_1 = require("../models/DailyClosing");
const Order_1 = require("../models/Order");
const Expense_1 = require("../models/Expense");
const Product_1 = require("../models/Product");
const MilkSale_1 = require("../models/MilkSale");
const getGallaStatus = async (req, res) => {
    try {
        const targetDate = req.query.date ? new Date(req.query.date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        // Get last daily closing actual cash as opening cash
        const lastClosing = await DailyClosing_1.DailyClosing.findOne({
            tenantId: req.tenantId,
            isClosed: true,
            date: { $lt: startOfDay }
        }).sort({ date: -1 });
        const openingCash = lastClosing ? lastClosing.summary.actualGalla : 10000; // Default Rs 10,000 opening cash
        // Fetch all cash transactions for this date
        const transactions = await CashTransaction_1.CashTransaction.find({
            tenantId: req.tenantId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        const cashSales = transactions.filter(t => t.type === 'CASH_SALE').reduce((acc, curr) => acc + curr.amount, 0);
        const collections = transactions.filter(t => t.type === 'CUSTOMER_COLLECTION').reduce((acc, curr) => acc + curr.amount, 0);
        // Farmer payments in cash
        const farmerPayments = Math.abs(transactions.filter(t => t.type === 'FARMER_PAYMENT').reduce((acc, curr) => acc + curr.amount, 0));
        const expenses = Math.abs(transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0));
        const totalCashIn = cashSales + collections;
        const totalCashOut = farmerPayments + expenses;
        const expectedGalla = Math.round((openingCash + totalCashIn - totalCashOut) * 100) / 100;
        // Direct Milk Sales Breakdown today
        const milkSalesToday = await MilkSale_1.MilkSale.find({
            tenantId: req.tenantId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        const superMilkTotalQty = milkSalesToday.reduce((sum, s) => sum + (s.superMilk?.quantity || 0), 0);
        const superMilkTotalAmt = milkSalesToday.reduce((sum, s) => sum + (s.superMilk?.amount || 0), 0);
        const regularMilkTotalQty = milkSalesToday.reduce((sum, s) => sum + (s.regularMilk?.quantity || 0), 0);
        const regularMilkTotalAmt = milkSalesToday.reduce((sum, s) => sum + (s.regularMilk?.amount || 0), 0);
        const cowMilkTotalQty = milkSalesToday.reduce((sum, s) => sum + (s.cowMilk?.quantity || 0), 0);
        const cowMilkTotalAmt = milkSalesToday.reduce((sum, s) => sum + (s.cowMilk?.amount || 0), 0);
        res.json({
            openingCash,
            cashSales: Math.round(cashSales * 100) / 100,
            collections: Math.round(collections * 100) / 100,
            farmerPayments: Math.round(farmerPayments * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            totalCashIn: Math.round(totalCashIn * 100) / 100,
            totalCashOut: Math.round(totalCashOut * 100) / 100,
            expectedGalla,
            milkSalesBreakdown: {
                superMilk: { quantity: superMilkTotalQty, amount: superMilkTotalAmt },
                regularMilk: { quantity: regularMilkTotalQty, amount: regularMilkTotalAmt },
                cowMilk: { quantity: cowMilkTotalQty, amount: cowMilkTotalAmt },
                totalDirectQty: superMilkTotalQty + regularMilkTotalQty + cowMilkTotalQty,
                totalDirectAmt: superMilkTotalAmt + regularMilkTotalAmt + cowMilkTotalAmt
            }
        });
    }
    catch (error) {
        console.error('Get Galla Status Error:', error);
        res.status(500).json({ message: 'Error retrieving cash Galla status.' });
    }
};
exports.getGallaStatus = getGallaStatus;
const forecastGallaAndProfit = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        // 1. Expected Sales
        const bookedSales = await Order_1.Order.find({
            tenantId: req.tenantId,
            orderDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'Cancelled' }
        });
        const currentSalesVal = bookedSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
        // Forecast: add 15% estimated increase for evening shift sales based on history
        const forecastedExtraSales = currentSalesVal > 0 ? Math.round((currentSalesVal * 0.15) * 100) / 100 : 5000;
        const expectedSales = Math.round((currentSalesVal + forecastedExtraSales) * 100) / 100;
        // 2. Cost of goods sold (COGS)
        // We compute actual cost of booked orders using product costPrice
        let bookedCOGS = 0;
        for (const order of bookedSales) {
            for (const item of order.items) {
                // Fetch product to retrieve cost price
                const product = await Product_1.Product.findById(item.product);
                const costPrice = product ? product.costPrice : (item.rate * 0.7); // fallback to 70% of rate
                bookedCOGS += item.quantity * costPrice;
            }
        }
        const estimatedCOGS = Math.round((bookedCOGS + (forecastedExtraSales * 0.75)) * 100) / 100;
        // 3. Expenses today
        const expensesToday = await Expense_1.Expense.find({
            tenantId: req.tenantId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        const totalExpenses = expensesToday.reduce((acc, curr) => acc + curr.amount, 0);
        const expectedProfit = Math.round((expectedSales - estimatedCOGS - totalExpenses) * 100) / 100;
        res.json({
            currentSales: Math.round(currentSalesVal * 100) / 100,
            forecastedExtraSales,
            expectedSales,
            estimatedCOGS,
            totalExpenses,
            expectedProfit
        });
    }
    catch (error) {
        console.error('Forecast Profit Error:', error);
        res.status(500).json({ message: 'Error generating daily business predictions.' });
    }
};
exports.forecastGallaAndProfit = forecastGallaAndProfit;
