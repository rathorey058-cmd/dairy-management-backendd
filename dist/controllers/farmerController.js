"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmerMilkHistory = exports.getFarmerLedger = exports.updateFarmer = exports.getFarmerById = exports.createFarmer = exports.getFarmers = void 0;
const Farmer_1 = require("../models/Farmer");
const FarmerLedger_1 = require("../models/FarmerLedger");
const MilkCollection_1 = require("../models/MilkCollection");
const getFarmers = async (req, res) => {
    try {
        const { search, village, status } = req.query;
        const filter = { tenantId: req.tenantId };
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
        const farmers = await Farmer_1.Farmer.find(filter).sort({ farmerId: 1 });
        res.json(farmers);
    }
    catch (error) {
        console.error('Get Farmers Error:', error);
        res.status(500).json({ message: 'Error retrieving farmers.' });
    }
};
exports.getFarmers = getFarmers;
const createFarmer = async (req, res) => {
    try {
        const { name, mobile, village, address, bankAccount, ifsc, upi, openingBalance, openingAdvance, notes, fatRate, dpdpConsentGiven = true, dpdpConsentChannel = 'WHATSAPP_SMS_PHYSICAL' } = req.body;
        if (!name || !mobile || !village) {
            res.status(400).json({ message: 'Name, mobile and village are required.' });
            return;
        }
        // Auto-generate farmerId based on current count
        const farmerCount = await Farmer_1.Farmer.countDocuments({ tenantId: req.tenantId });
        const farmerId = `F-${String(farmerCount + 1).padStart(4, '0')}`;
        const farmer = new Farmer_1.Farmer({
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
            notes,
            dpdpConsentGiven: dpdpConsentGiven !== false,
            dpdpConsentDate: new Date(),
            dpdpConsentChannel
        });
        await farmer.save();
        // If opening balance exists, write to ledger
        if (openingBalance && openingBalance !== 0) {
            await FarmerLedger_1.FarmerLedger.create({
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
    }
    catch (error) {
        console.error('Create Farmer Error:', error);
        res.status(500).json({ message: 'Error creating farmer.' });
    }
};
exports.createFarmer = createFarmer;
const getFarmerById = async (req, res) => {
    try {
        const farmer = await Farmer_1.Farmer.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!farmer) {
            res.status(404).json({ message: 'Farmer not found.' });
            return;
        }
        res.json(farmer);
    }
    catch (error) {
        console.error('Get Farmer By ID Error:', error);
        res.status(500).json({ message: 'Error fetching farmer details.' });
    }
};
exports.getFarmerById = getFarmerById;
const updateFarmer = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        delete updateData.farmerId;
        delete updateData.tenantId;
        if (updateData.dpdpConsentGiven !== undefined) {
            updateData.dpdpConsentDate = new Date();
        }
        const updated = await Farmer_1.Farmer.findOneAndUpdate({ _id: id, tenantId: req.tenantId }, { $set: updateData }, { new: true });
        if (!updated) {
            res.status(404).json({ message: 'Farmer not found.' });
            return;
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Update Farmer Error:', error);
        res.status(500).json({ message: 'Error updating farmer.' });
    }
};
exports.updateFarmer = updateFarmer;
const getFarmerLedger = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {
            tenantId: req.tenantId,
            farmer: req.params.id
        };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                filter.date.$gte = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                filter.date.$lte = e;
            }
        }
        const ledger = await FarmerLedger_1.FarmerLedger.find(filter).sort({ date: 1, createdAt: 1 });
        res.json(ledger);
    }
    catch (error) {
        console.error('Get Farmer Ledger Error:', error);
        res.status(500).json({ message: 'Error retrieving farmer ledger.' });
    }
};
exports.getFarmerLedger = getFarmerLedger;
const getFarmerMilkHistory = async (req, res) => {
    try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit) : 50;
        const history = await MilkCollection_1.MilkCollection.find({
            tenantId: req.tenantId,
            farmer: req.params.id
        })
            .sort({ date: -1 })
            .limit(limitNum);
        res.json(history);
    }
    catch (error) {
        console.error('Get Farmer Milk History Error:', error);
        res.status(500).json({ message: 'Error retrieving milk history.' });
    }
};
exports.getFarmerMilkHistory = getFarmerMilkHistory;
