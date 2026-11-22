"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditImage = exports.getTriMatchReport = void 0;
const CameraAuditLog_1 = require("../models/CameraAuditLog");
const AudioTranscript_1 = require("../models/AudioTranscript");
const MilkSale_1 = require("../models/MilkSale");
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const PRE_MS = 20 * 1000; // audio/bill can come slightly before the detected arrival
const POST_MS = 150 * 1000; // ... and up to 2.5 min after
/**
 * Visit-by-visit Video + Audio + POS reconciliation for a whole day / shop-hours window.
 * Every customer arrival seen by camera = one visit. Audio, POS bills and galla openings
 * are attached to the visit they belong to (by time), and a verdict is computed.
 */
const getTriMatchReport = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const { date, startTime = '05:00', endTime = '22:00' } = req.query;
        const day = typeof date === 'string' && date ? date : new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0];
        const from = new Date(`${day}T${startTime}:00+05:30`);
        const to = new Date(`${day}T${endTime}:59.999+05:30`);
        const [visitsRaw, audios, milk, orders, galla] = await Promise.all([
            CameraAuditLog_1.CameraAuditLog.find({
                tenantId,
                eventType: 'FACE_VISIT',
                timestamp: { $gte: from, $lte: to },
                snapshotImage: { $not: /^(SCAN|AUDIO)_REQ:/ },
            })
                .sort({ timestamp: 1 })
                .select('timestamp visitCountToday videoZone aiAnalysis notes')
                .lean(),
            AudioTranscript_1.AudioTranscript.find({ tenantId, timestamp: { $gte: from, $lte: to } }).sort({ timestamp: 1 }).lean(),
            MilkSale_1.MilkSale.find({ tenantId, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }).lean(),
            Order_1.Order.find({ tenantId, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }).lean(),
            CameraAuditLog_1.CameraAuditLog.find({
                tenantId, eventType: { $in: ['GALLA_ALERT', 'CASH_DRAWER_MISMATCH'] }, timestamp: { $gte: from, $lte: to },
            }).sort({ timestamp: 1 }).select('timestamp eventType').lean(),
        ]);
        // product names for order labels
        const pids = new Set();
        orders.forEach((o) => o.items?.forEach((i) => i.product && pids.add(i.product.toString())));
        const prods = pids.size ? await Product_1.Product.find({ _id: { $in: [...pids] } }).select('name') : [];
        const pname = {};
        prods.forEach((p) => { pname[p._id.toString()] = p.name; });
        const bills = [
            ...milk.map((m) => ({
                id: m._id.toString(), at: m.createdAt, amount: Math.round(m.totalAmount || 0), mode: m.paymentMode,
                label: `दूध ${Math.round((m.totalQuantity || 0) * 100) / 100} L`,
            })),
            ...orders.map((o) => ({
                id: o._id.toString(), at: o.createdAt, amount: Math.round(o.totalAmount || 0), mode: o.paymentMode,
                label: (o.items || []).slice(0, 3).map((i) => `${pname[i.product?.toString()] || 'सामान'} ×${i.quantity}`).join(', ') || 'सामान',
            })),
        ].sort((a, b) => a.at.getTime() - b.at.getTime());
        const visits = visitsRaw.map((v) => ({
            id: v._id.toString(),
            at: v.timestamp,
            people: v.visitCountToday || 1,
            aiAnalysis: v.aiAnalysis || null,
            videoZone: v.videoZone || null,
            audio: [],
            bills: [],
            galla: [],
        }));
        // attach item to the visit it belongs to
        const attach = (t) => {
            let best = -1;
            for (let i = 0; i < visits.length; i++) {
                const vt = visits[i].at.getTime();
                if (t >= vt - PRE_MS && t <= vt + POST_MS) {
                    // prefer latest visit that started at/before the item; else earliest following visit
                    if (vt <= t)
                        best = i;
                    else if (best === -1) {
                        best = i;
                        break;
                    }
                }
            }
            return best;
        };
        const orphanAudio = [];
        const orphanBills = [];
        const audioView = (a) => ({ at: a.timestamp, text: a.text, amounts: a.amounts || [], items: a.items || [] });
        audios.forEach((a) => {
            const idx = attach(a.timestamp.getTime());
            if (idx >= 0)
                visits[idx].audio.push(audioView(a));
            else if ((a.amounts?.length || a.items?.length))
                orphanAudio.push(audioView(a));
        });
        bills.forEach(b => {
            const idx = attach(b.at.getTime());
            if (idx >= 0)
                visits[idx].bills.push(b);
            else
                orphanBills.push(b);
        });
        galla.forEach((g) => {
            const idx = attach(g.timestamp.getTime());
            if (idx >= 0)
                visits[idx].galla.push({ at: g.timestamp, billed: g.eventType === 'GALLA_ALERT' });
        });
        const near = (a, b) => Math.abs(a - b) <= Math.max(10, b * 0.1);
        const out = visits.map(v => {
            const posTotal = v.bills.reduce((s, b) => s + b.amount, 0);
            const aiAmt = Number(v.aiAnalysis?.amountPaid || 0);
            const aiQuote = String(v.aiAnalysis?.audioQuote || '').trim();
            const aiReq = String(v.aiAnalysis?.requestedItem || '').trim();
            const aiGiven = String(v.aiAnalysis?.givenItem || '').trim();
            const aiSummary = String(v.aiAnalysis?.analystSummary || '').trim();
            const heard = v.audio.flatMap((a) => a.amounts);
            if (!heard.length && aiAmt > 0)
                heard.push(aiAmt);
            const heardAmt = heard.length ? heard[heard.length - 1] : 0;
            const hasBill = v.bills.length > 0;
            const hasAudio = heard.length > 0 || v.audio.some((a) => a.items.length > 0) || Boolean(aiQuote) || Boolean(aiReq && aiReq !== 'स्पष्ट नहीं');
            const gallaOpen = v.galla.length > 0 || Boolean(v.aiAnalysis?.cashHandedOver);
            let verdict;
            let note;
            if (hasBill && heard.length && (heard.some(h => near(h, posTotal)))) {
                verdict = 'MATCH';
                note = `ऑडियो ₹${heardAmt} और बिल ₹${posTotal} मेल खाते हैं।`;
            }
            else if (hasBill && heard.length) {
                verdict = 'AMOUNT_DIFF';
                note = `ऑडियो में ₹${heardAmt} सुना, बिल ₹${posTotal} कटा — रकम अलग है।`;
            }
            else if (hasBill) {
                verdict = 'POS_ONLY';
                note = `बिल ₹${posTotal} कटा (ऑडियो में रकम साफ़ नहीं सुनी)।`;
            }
            else if (heard.length || hasAudio) {
                verdict = 'AUDIO_NO_BILL';
                note = aiSummary || (heard.length ? `ग्राहक ने ₹${heardAmt} की बात की, पर कोई बिल नहीं कटा।` : 'सामान की बात सुनी गई, पर कोई बिल नहीं कटा।');
            }
            else if (gallaOpen) {
                verdict = 'GALLA_NO_BILL';
                note = aiSummary || 'गल्ला खुला, पर न बिल कटा न कोई बात रिकॉर्ड हुई।';
            }
            else {
                verdict = 'NO_PURCHASE';
                note = aiSummary || 'ग्राहक आया, कोई खरीद दिखी नहीं।';
            }
            const audioOut = v.audio.length
                ? v.audio
                : (aiQuote ? [{ at: v.at, text: aiQuote, amounts: aiAmt ? [aiAmt] : [], items: aiReq ? [{ name: aiReq }] : [] }] : []);
            return {
                id: v.id, time: v.at, people: v.people,
                video: { arrived: true, people: v.people, givenItem: aiGiven || v.videoZone || undefined },
                audio: audioOut, pos: { bills: v.bills, total: posTotal }, galla: v.galla,
                heardAmount: heardAmt || null,
                verdict, note,
            };
        });
        const count = (vd) => out.filter(v => v.verdict === vd).length;
        const customers = out.reduce((s, v) => s + v.people, 0);
        const posTotalAll = bills.reduce((s, b) => s + b.amount, 0);
        const audioTotal = out.reduce((s, v) => s + (v.heardAmount || 0), 0);
        res.json({
            success: true,
            window: { date: day, startTime, endTime },
            summary: {
                customers,
                visits: out.length,
                posBills: bills.length,
                posTotal: posTotalAll,
                audioHeardTotal: audioTotal,
                audioClips: audios.length,
                matched: count('MATCH'),
                posOnly: count('POS_ONLY'),
                amountDiff: count('AMOUNT_DIFF'),
                audioNoBill: count('AUDIO_NO_BILL'),
                gallaNoBill: count('GALLA_NO_BILL'),
                noPurchase: count('NO_PURCHASE'),
                orphanBills: orphanBills.length,
                orphanAudio: orphanAudio.length,
            },
            visits: out,
            orphanBills,
            orphanAudio,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'मिलान रिपोर्ट नहीं बन सकी।', error: error.message });
    }
};
exports.getTriMatchReport = getTriMatchReport;
/** Snapshot of a visit (loaded lazily so the report stays light). */
const getAuditImage = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const log = await CameraAuditLog_1.CameraAuditLog.findOne({ _id: req.params.id, tenantId }).select('snapshotImage');
        const img = log?.snapshotImage;
        if (!img || !img.startsWith('data:image')) {
            res.status(404).end();
            return;
        }
        const m = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!m) {
            res.status(404).end();
            return;
        }
        res.setHeader('Content-Type', m[1]);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.send(Buffer.from(m[2], 'base64'));
    }
    catch {
        res.status(500).end();
    }
};
exports.getAuditImage = getAuditImage;
