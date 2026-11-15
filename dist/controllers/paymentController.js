"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettlementCycleSheet = exports.getSettlementById = exports.settleAccount = exports.makePayment = exports.giveAdvance = void 0;
const mongoose_1 = require("mongoose");
const Farmer_1 = require("../models/Farmer");
const FarmerAdvance_1 = require("../models/FarmerAdvance");
const FarmerPayment_1 = require("../models/FarmerPayment");
const FarmerSettlement_1 = require("../models/FarmerSettlement");
const FarmerLedger_1 = require("../models/FarmerLedger");
const MilkCollection_1 = require("../models/MilkCollection");
const Tenant_1 = require("../models/Tenant");
const milkService_1 = require("../services/milkService");
const giveAdvance = async (req, res) => {
    try {
        const { farmerId, amount, paymentMode, referenceNumber, notes } = req.body;
        if (!farmerId || !amount || !paymentMode) {
            res.status(400).json({ message: 'Farmer, amount and payment mode are required.' });
            return;
        }
        const farmer = await Farmer_1.Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
        if (!farmer) {
            res.status(404).json({ message: 'Farmer not found.' });
            return;
        }
        const advance = new FarmerAdvance_1.FarmerAdvance({
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
        await (0, milkService_1.postLedgerEntry)(req.tenantId.toString(), farmerId, new Date(), 'ADVANCE_GIVEN', -amount, `Advance Paid to Farmer: ₹${amount} (${paymentMode})`, advance._id.toString());
        res.status(201).json(advance);
    }
    catch (error) {
        console.error('Give Advance Error:', error);
        res.status(500).json({ message: 'Error booking farmer advance.' });
    }
};
exports.giveAdvance = giveAdvance;
const makePayment = async (req, res) => {
    try {
        const { farmerId, amount, paymentMode, referenceNumber, notes } = req.body;
        if (!farmerId || !amount || !paymentMode) {
            res.status(400).json({ message: 'Farmer, amount and payment mode are required.' });
            return;
        }
        const farmer = await Farmer_1.Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
        if (!farmer) {
            res.status(404).json({ message: 'Farmer not found.' });
            return;
        }
        const payment = new FarmerPayment_1.FarmerPayment({
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
        await (0, milkService_1.postLedgerEntry)(req.tenantId.toString(), farmerId, new Date(), 'PAYMENT_MADE', -amount, `Payment made to Farmer: ₹${amount} (${paymentMode})`, payment._id.toString());
        res.status(201).json(payment);
    }
    catch (error) {
        console.error('Make Payment Error:', error);
        res.status(500).json({ message: 'Error saving payment.' });
    }
};
exports.makePayment = makePayment;
const settleAccount = async (req, res) => {
    try {
        const { farmerId, amountPaid, paymentMode, referenceNumber, notes } = req.body;
        if (!farmerId || amountPaid === undefined || !paymentMode) {
            res.status(400).json({ message: 'Farmer, amount paid and payment mode are required.' });
            return;
        }
        const farmer = await Farmer_1.Farmer.findOne({ _id: farmerId, tenantId: req.tenantId });
        if (!farmer) {
            res.status(404).json({ message: 'Farmer not found.' });
            return;
        }
        // Get current ledger balance
        const lastLedger = await FarmerLedger_1.FarmerLedger.findOne({ tenantId: req.tenantId, farmer: farmerId })
            .sort({ date: -1, createdAt: -1 });
        const currentBalance = lastLedger ? lastLedger.balance : 0;
        // Find all active advances
        const activeAdvances = await FarmerAdvance_1.FarmerAdvance.find({
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
        if (advanceToAdjust < 0)
            advanceToAdjust = 0;
        const netPayable = Math.round((currentBalance - advanceToAdjust) * 100) / 100;
        // Deduct remaining advance from advance sheets
        let remainingToAdjust = advanceToAdjust;
        for (const adv of activeAdvances) {
            if (remainingToAdjust <= 0)
                break;
            const adjustAmount = Math.min(adv.remainingAdvance, remainingToAdjust);
            adv.remainingAdvance = Math.round((adv.remainingAdvance - adjustAmount) * 100) / 100;
            await adv.save();
            remainingToAdjust -= adjustAmount;
        }
        const settlement = new FarmerSettlement_1.FarmerSettlement({
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
            await (0, milkService_1.postLedgerEntry)(req.tenantId.toString(), farmerId, new Date(), 'ADJUSTMENT', -advanceToAdjust, `Settlement Advance Adjusted: -₹${advanceToAdjust}`, settlement._id.toString());
        }
        // 2. Write settlement payment entry (reduces payable, so negative)
        if (amountPaid > 0) {
            await (0, milkService_1.postLedgerEntry)(req.tenantId.toString(), farmerId, new Date(), 'PAYMENT_MADE', -amountPaid, `Settlement Cash Paid: -₹${amountPaid} (${paymentMode})`, settlement._id.toString());
        }
        res.status(201).json(settlement);
    }
    catch (error) {
        console.error('Settle Account Error:', error);
        res.status(500).json({ message: 'Error processing farmer settlement.' });
    }
};
exports.settleAccount = settleAccount;
const getSettlementById = async (req, res) => {
    try {
        const settlement = await FarmerSettlement_1.FarmerSettlement.findOne({
            _id: req.params.id,
            tenantId: req.tenantId
        }).populate('farmer', 'farmerId name mobile village address');
        if (!settlement) {
            res.status(404).json({ message: 'Settlement receipt not found.' });
            return;
        }
        res.json(settlement);
    }
    catch (error) {
        console.error('Get Settlement Error:', error);
        res.status(500).json({ message: 'Error fetching settlement receipt.' });
    }
};
exports.getSettlementById = getSettlementById;
/**
 * 10-Day (or configured cycle) Billing Sheet Aggregation
 * Aggregates daily milk entries, average FAT/SNF, gross value, advances, and net payable.
 * Generates WhatsApp bill slip text & dynamic chart data.
 */
const getSettlementCycleSheet = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { cycleType: queryCycleType, year: qYear, month: qMonth, decadeIndex: qDecade, startDate: qStart, endDate: qEnd, farmerId } = req.query;
        const tenant = await Tenant_1.Tenant.findById(tenantId);
        const cycleType = queryCycleType || tenant?.settlementCycle?.cycleType || '10_DAY';
        const now = new Date();
        const currentYear = qYear ? parseInt(qYear, 10) : now.getFullYear();
        const currentMonth = qMonth ? parseInt(qMonth, 10) - 1 : now.getMonth(); // 0-indexed
        let periodStart;
        let periodEnd;
        let periodLabel = '';
        if (qStart && qEnd) {
            periodStart = new Date(qStart);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(qEnd);
            periodEnd.setHours(23, 59, 59, 999);
            periodLabel = `${periodStart.toLocaleDateString('hi-IN')} - ${periodEnd.toLocaleDateString('hi-IN')}`;
        }
        else if (cycleType === '10_DAY') {
            const decade = qDecade ? parseInt(qDecade, 10) : (now.getDate() <= 10 ? 1 : now.getDate() <= 20 ? 2 : 3);
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            if (decade === 1) {
                periodStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
                periodEnd = new Date(currentYear, currentMonth, 10, 23, 59, 59, 999);
                periodLabel = `1 से 10 ${periodStart.toLocaleString('hi-IN', { month: 'short' })} ${currentYear} (दशक १ / Decade 1)`;
            }
            else if (decade === 2) {
                periodStart = new Date(currentYear, currentMonth, 11, 0, 0, 0);
                periodEnd = new Date(currentYear, currentMonth, 20, 23, 59, 59, 999);
                periodLabel = `11 से 20 ${periodStart.toLocaleString('hi-IN', { month: 'short' })} ${currentYear} (दशक २ / Decade 2)`;
            }
            else {
                periodStart = new Date(currentYear, currentMonth, 21, 0, 0, 0);
                periodEnd = new Date(currentYear, currentMonth, lastDayOfMonth, 23, 59, 59, 999);
                periodLabel = `21 से ${lastDayOfMonth} ${periodStart.toLocaleString('hi-IN', { month: 'short' })} ${currentYear} (दशक ३ / Decade 3)`;
            }
        }
        else if (cycleType === 'WEEKLY') {
            // Last 7 days or selected week
            periodEnd = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
            periodStart = new Date(periodEnd);
            periodStart.setDate(periodEnd.getDate() - 6);
            periodStart.setHours(0, 0, 0, 0);
            periodLabel = `साप्ताहिक बिल (${periodStart.toLocaleDateString('hi-IN')} - ${periodEnd.toLocaleDateString('hi-IN')})`;
        }
        else if (cycleType === '15_DAY') {
            const isFirstHalf = now.getDate() <= 15;
            if (isFirstHalf) {
                periodStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
                periodEnd = new Date(currentYear, currentMonth, 15, 23, 59, 59, 999);
                periodLabel = `1 से 15 ${periodStart.toLocaleString('hi-IN', { month: 'short' })} ${currentYear} (पाक्षिक १)`;
            }
            else {
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                periodStart = new Date(currentYear, currentMonth, 16, 0, 0, 0);
                periodEnd = new Date(currentYear, currentMonth, lastDay, 23, 59, 59, 999);
                periodLabel = `16 से ${lastDay} ${periodStart.toLocaleString('hi-IN', { month: 'short' })} ${currentYear} (पाक्षिक २)`;
            }
        }
        else {
            // Monthly
            const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
            periodStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
            periodEnd = new Date(currentYear, currentMonth, lastDay, 23, 59, 59, 999);
            periodLabel = `पूरा महीना (${periodStart.toLocaleString('hi-IN', { month: 'long', year: 'numeric' })})`;
        }
        // Filter farmers
        const targetFarmerId = typeof farmerId === 'string' && farmerId.trim() !== '' && mongoose_1.Types.ObjectId.isValid(farmerId.trim())
            ? new mongoose_1.Types.ObjectId(farmerId.trim())
            : undefined;
        const farmerFilter = { tenantId, status: { $ne: 'Inactive' } };
        if (targetFarmerId)
            farmerFilter._id = targetFarmerId;
        const farmersList = await Farmer_1.Farmer.find(farmerFilter).sort({ farmerId: 1, name: 1 });
        // Fetch all collections in this period
        const collectionFilter = {
            tenantId,
            date: { $gte: periodStart, $lte: periodEnd }
        };
        if (targetFarmerId)
            collectionFilter.farmer = targetFarmerId;
        const collections = await MilkCollection_1.MilkCollection.find(collectionFilter).sort({ date: 1, shift: 1 });
        // Fetch all advances in this period
        const advanceFilter = {
            tenantId,
            date: { $gte: periodStart, $lte: periodEnd }
        };
        if (targetFarmerId)
            advanceFilter.farmer = targetFarmerId;
        const advances = await FarmerAdvance_1.FarmerAdvance.find(advanceFilter);
        // Group collections by farmer
        const farmerDataMap = {};
        for (const f of farmersList) {
            farmerDataMap[f._id.toString()] = {
                farmerId: f.farmerId,
                _id: f._id,
                name: f.name,
                mobile: f.mobile,
                village: f.village || '',
                entries: [],
                totalMorningQty: 0,
                totalEveningQty: 0,
                totalQty: 0,
                fatQtyProduct: 0,
                snfQtyProduct: 0,
                totalMilkValue: 0,
                advancesDeducted: 0,
                netPayable: 0,
                whatsappText: ''
            };
        }
        // Populate collections
        for (const c of collections) {
            const fid = c.farmer.toString();
            if (!farmerDataMap[fid])
                continue;
            const qty = Number(c.quantity) || 0;
            const fat = Number(c.fat) || 0;
            const snf = Number(c.snf) || 0;
            const amt = Number(c.amount) || 0;
            farmerDataMap[fid].entries.push({
                _id: c._id,
                date: c.date,
                dateStr: new Date(c.date).toISOString().split('T')[0],
                shift: c.shift,
                milkType: c.milkType,
                quantity: qty,
                fat,
                snf,
                rate: c.rate,
                amount: amt
            });
            if (c.shift === 'Morning') {
                farmerDataMap[fid].totalMorningQty += qty;
            }
            else {
                farmerDataMap[fid].totalEveningQty += qty;
            }
            farmerDataMap[fid].totalQty += qty;
            farmerDataMap[fid].fatQtyProduct += fat * qty;
            farmerDataMap[fid].snfQtyProduct += snf * qty;
            farmerDataMap[fid].totalMilkValue += amt;
        }
        // Populate advances
        for (const adv of advances) {
            const fid = adv.farmer.toString();
            if (farmerDataMap[fid]) {
                farmerDataMap[fid].advancesDeducted += Number(adv.amount) || 0;
            }
        }
        // Compute averages, net payable & generate WhatsApp / slip texts
        const dairyName = tenant?.name || 'श्री कृष्णा डेयरी';
        const dairyPhone = tenant?.whatsappNumber || tenant?.mobile || '';
        const farmerSheets = Object.values(farmerDataMap).map((fd) => {
            const totalQty = Math.round(fd.totalQty * 100) / 100;
            const avgFat = totalQty > 0 ? Math.round((fd.fatQtyProduct / totalQty) * 10) / 10 : 0;
            const avgSnf = totalQty > 0 ? Math.round((fd.snfQtyProduct / totalQty) * 10) / 10 : 0;
            const totalMilkValue = Math.round(fd.totalMilkValue * 100) / 100;
            const advancesDeducted = Math.round(fd.advancesDeducted * 100) / 100;
            const netPayable = Math.max(0, Math.round((totalMilkValue - advancesDeducted) * 100) / 100);
            // Clean, formatted WhatsApp Bill Slip
            const whatsappMsg = `🥛 *${dairyName.toUpperCase()}* 🥛
📋 *दूध बिल पर्ची (Settlement Slip)*
---------------------------------
👤 *किसान:* ${fd.name} (कोड: #${fd.farmerId})
📱 *मोबाइल:* ${fd.mobile}
🗓️ *बिल अवधि:* ${periodLabel}
---------------------------------
☀️ सुबह कुल दूध: ${Math.round(fd.totalMorningQty * 10) / 10} L
🌙 शाम कुल दूध: ${Math.round(fd.totalEveningQty * 10) / 10} L
📦 *कुल दूध मात्रा:* ${totalQty} L
📊 *औसत FAT:* ${avgFat}% | *SNF:* ${avgSnf}%
💰 *कुल दूध मूल्य:* ₹${totalMilkValue.toLocaleString('en-IN')}
🔻 *काटा गया एडवांस:* -₹${advancesDeducted.toLocaleString('en-IN')}
---------------------------------
💵 *शुद्ध देय राशि (NET PAYABLE): ₹${netPayable.toLocaleString('en-IN')}*
---------------------------------
धन्यवाद! संपर्क: ${dairyPhone}`;
            return {
                farmerId: fd.farmerId,
                _id: fd._id,
                name: fd.name,
                mobile: fd.mobile,
                village: fd.village,
                entriesCount: fd.entries.length,
                entries: fd.entries,
                totalMorningQty: Math.round(fd.totalMorningQty * 100) / 100,
                totalEveningQty: Math.round(fd.totalEveningQty * 100) / 100,
                totalQty,
                avgFat,
                avgSnf,
                totalMilkValue,
                advancesDeducted,
                netPayable,
                whatsappText: whatsappMsg
            };
        }).filter(f => f.entriesCount > 0 || f.advancesDeducted > 0);
        // Dynamic daily chart trend for this cycle
        const dayMap = {};
        const curDate = new Date(periodStart);
        while (curDate <= periodEnd) {
            const dStr = curDate.toISOString().split('T')[0];
            dayMap[dStr] = { date: dStr, morningQty: 0, eveningQty: 0, totalQty: 0, totalAmount: 0 };
            curDate.setDate(curDate.getDate() + 1);
        }
        for (const c of collections) {
            const dStr = new Date(c.date).toISOString().split('T')[0];
            if (dayMap[dStr]) {
                const q = Number(c.quantity) || 0;
                const a = Number(c.amount) || 0;
                if (c.shift === 'Morning') {
                    dayMap[dStr].morningQty += q;
                }
                else {
                    dayMap[dStr].eveningQty += q;
                }
                dayMap[dStr].totalQty += q;
                dayMap[dStr].totalAmount += a;
            }
        }
        const dailyTrend = Object.values(dayMap).map(d => ({
            ...d,
            morningQty: Math.round(d.morningQty * 10) / 10,
            eveningQty: Math.round(d.eveningQty * 10) / 10,
            totalQty: Math.round(d.totalQty * 10) / 10,
            totalAmount: Math.round(d.totalAmount)
        }));
        // Overall Dairy Totals for this period
        const totalCycleMilk = farmerSheets.reduce((sum, f) => sum + f.totalQty, 0);
        const totalCyclePayout = farmerSheets.reduce((sum, f) => sum + f.totalMilkValue, 0);
        const totalNetPayable = farmerSheets.reduce((sum, f) => sum + f.netPayable, 0);
        const totalAdvances = farmerSheets.reduce((sum, f) => sum + f.advancesDeducted, 0);
        res.json({
            success: true,
            cycleType,
            periodLabel,
            periodStart,
            periodEnd,
            totals: {
                totalFarmers: farmerSheets.length,
                totalCycleMilk: Math.round(totalCycleMilk * 10) / 10,
                totalCyclePayout: Math.round(totalCyclePayout),
                totalAdvances: Math.round(totalAdvances),
                totalNetPayable: Math.round(totalNetPayable),
                averageFatOverall: totalCycleMilk > 0
                    ? Math.round((farmerSheets.reduce((acc, f) => acc + f.avgFat * f.totalQty, 0) / totalCycleMilk) * 10) / 10
                    : 0
            },
            dailyTrend,
            farmerSheets
        });
    }
    catch (error) {
        console.error('getSettlementCycleSheet error:', error);
        res.status(500).json({ message: 'Error generating settlement cycle sheet', error: error.message });
    }
};
exports.getSettlementCycleSheet = getSettlementCycleSheet;
