"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDuePayment = exports.getCustomerLedgerStatement = exports.getDueCustomers = void 0;
const Customer_1 = require("../models/Customer");
const CustomerLedger_1 = require("../models/CustomerLedger");
const CashTransaction_1 = require("../models/CashTransaction");
const MilkBandhi_1 = require("../models/MilkBandhi");
// 1. Get all customers with pending due balance & market summary
const getDueCustomers = async (req, res) => {
    try {
        const { search, onlyDue = 'true' } = req.query;
        const filter = { tenantId: req.tenantId };
        if (onlyDue === 'true') {
            filter.outstandingBalance = { $gt: 0 };
        }
        if (search) {
            filter.$or = [
                { name: new RegExp(String(search), 'i') },
                { mobile: new RegExp(String(search), 'i') },
                { address: new RegExp(String(search), 'i') },
            ];
        }
        const customers = await Customer_1.Customer.find(filter).sort({ outstandingBalance: -1 });
        // Fetch bandhis to map bandhi numbers to customers
        const bandhis = await MilkBandhi_1.MilkBandhi.find({ tenantId: req.tenantId });
        const bandhiMap = new Map();
        bandhis.forEach(b => {
            if (b.customer)
                bandhiMap.set(String(b.customer), b.bandhiNo);
        });
        const enrichedCustomers = customers.map(c => ({
            _id: c._id,
            name: c.name,
            mobile: c.mobile,
            address: c.address,
            area: c.area,
            creditLimit: c.creditLimit,
            outstandingBalance: c.outstandingBalance,
            bandhiNo: bandhiMap.get(String(c._id)) || null,
            updatedAt: c.updatedAt,
        }));
        // Calculate market due stats
        const allDebtors = await Customer_1.Customer.find({ tenantId: req.tenantId, outstandingBalance: { $gt: 0 } });
        const totalMarketDue = Math.round(allDebtors.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0) * 100) / 100;
        const totalDueCustomers = allDebtors.length;
        // Today's collections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const todayCollections = await CashTransaction_1.CashTransaction.find({
            tenantId: req.tenantId,
            type: 'CUSTOMER_COLLECTION',
            date: { $gte: today, $lte: endOfDay },
        });
        const todayCollectedAmount = Math.round(todayCollections.reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;
        res.json({
            customers: enrichedCustomers,
            summary: {
                totalMarketDue,
                totalDueCustomers,
                todayCollectedAmount,
            },
        });
    }
    catch (error) {
        console.error('Get Due Customers Error:', error);
        res.status(500).json({ message: 'उधारी सूची लोड करने में त्रुटि हुई।' });
    }
};
exports.getDueCustomers = getDueCustomers;
// 2. Get Customer Ledger Statement
const getCustomerLedgerStatement = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;
        const customer = await Customer_1.Customer.findOne({ _id: customerId, tenantId: req.tenantId });
        if (!customer) {
            res.status(404).json({ message: 'ग्राहक नहीं मिला।' });
            return;
        }
        const filter = { tenantId: req.tenantId, customer: customerId };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate)
                filter.date.$gte = new Date(startDate);
            if (endDate)
                filter.date.$lte = new Date(endDate);
        }
        const ledgerEntries = await CustomerLedger_1.CustomerLedger.find(filter).sort({ date: -1, createdAt: -1 });
        res.json({
            customer,
            ledgerEntries,
        });
    }
    catch (error) {
        console.error('Get Customer Ledger Error:', error);
        res.status(500).json({ message: 'ग्राहक खाता विवरण लोड करने में त्रुटि हुई।' });
    }
};
exports.getCustomerLedgerStatement = getCustomerLedgerStatement;
// 3. Collect Due Payment (जमा करें)
const collectDuePayment = async (req, res) => {
    try {
        const { customerId, amount, paymentMode = 'Cash', notes, date } = req.body;
        const paymentAmount = Number(amount);
        if (!customerId || !paymentAmount || paymentAmount <= 0) {
            res.status(400).json({ message: 'ग्राहक और मान्य भुगतान राशि आवश्यक है।' });
            return;
        }
        const customer = await Customer_1.Customer.findOne({ _id: customerId, tenantId: req.tenantId });
        if (!customer) {
            res.status(404).json({ message: 'ग्राहक रिकॉर्ड नहीं मिला।' });
            return;
        }
        const paymentDate = date ? new Date(date) : new Date();
        // 1. Reduce customer outstanding balance
        customer.outstandingBalance = Math.round((customer.outstandingBalance - paymentAmount) * 100) / 100;
        await customer.save();
        // 2. Post Customer Ledger Entry (type: 'PAYMENT', amount is negative in ledger to credit balance)
        const ledgerEntry = await CustomerLedger_1.CustomerLedger.create({
            tenantId: req.tenantId,
            customer: customer._id,
            date: paymentDate,
            description: `उधारी भुगतान प्राप्त (${paymentMode}): ${notes || 'नकद जमा'}`,
            type: 'PAYMENT',
            amount: -paymentAmount,
            balance: customer.outstandingBalance,
        });
        // 3. Post CashTransaction to Galla (if Cash payment)
        if (paymentMode === 'Cash' || !paymentMode) {
            await CashTransaction_1.CashTransaction.create({
                tenantId: req.tenantId,
                date: paymentDate,
                amount: paymentAmount,
                type: 'CUSTOMER_COLLECTION',
                description: `उधारी जमा - ${customer.name}: ₹${paymentAmount}`,
                referenceId: ledgerEntry._id,
            });
        }
        res.json({
            message: `₹${paymentAmount.toLocaleString('en-IN')} सफलतापूर्वक जमा कर लिए गए! शेष उधारी: ₹${customer.outstandingBalance.toLocaleString('en-IN')}`,
            customer,
            remainingBalance: customer.outstandingBalance,
            collectedAmount: paymentAmount,
        });
    }
    catch (error) {
        console.error('Collect Due Payment Error:', error);
        res.status(500).json({ message: error.message || 'भुगतान जमा करने में त्रुटि हुई।' });
    }
};
exports.collectDuePayment = collectDuePayment;
