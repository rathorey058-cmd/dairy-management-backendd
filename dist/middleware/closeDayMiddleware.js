"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDayClosed = void 0;
const DailyClosing_1 = require("../models/DailyClosing");
const checkDayClosed = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        // Check target transaction date. Body might contain "date" or "orderDate", fallback to current date.
        const targetDateStr = req.body.date || req.body.orderDate || new Date().toISOString();
        const targetDate = new Date(targetDateStr);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        // Look for a closed record on this date
        const closedRecord = await DailyClosing_1.DailyClosing.findOne({
            tenantId,
            date: { $gte: startOfDay, $lte: endOfDay },
            isClosed: true
        });
        if (closedRecord) {
            res.status(400).json({
                message: 'Transaction blocked: This calendar date has been closed and locked.'
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Check Day Closed Middleware Error:', error);
        res.status(500).json({ message: 'Error checking date close locks status.' });
    }
};
exports.checkDayClosed = checkDayClosed;
