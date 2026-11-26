"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveTelemetry = exports.pushLiveTelemetry = exports.liveTelemetryStore = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const server_1 = require("../server");
const CameraAuditLog_1 = require("../models/CameraAuditLog");
const AudioTranscript_1 = require("../models/AudioTranscript");
const RecorderHeartbeat_1 = require("../models/RecorderHeartbeat");
const CameraDevice_1 = require("../models/CameraDevice");
exports.liveTelemetryStore = new Map();
function resolveTenantIdFromReq(req) {
    if (req.tenantId)
        return String(req.tenantId);
    if (req.body?.tenantId && mongoose_1.Types.ObjectId.isValid(String(req.body.tenantId))) {
        return String(req.body.tenantId);
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const secret = process.env.JWT_SECRET || 'dairy-smart-ai-super-secret-key';
            const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], secret);
            if (decoded?.tenantId)
                return String(decoded.tenantId);
        }
        catch {
            // ignore token error for local edge push if tenantId was provided
        }
    }
    return null;
}
/**
 * POST /api/cameras/live-telemetry
 * High-frequency (~1s) ingestion from Python Edge AI engine (`edge_detector.py`)
 */
const pushLiveTelemetry = async (req, res) => {
    try {
        const tenantId = resolveTenantIdFromReq(req);
        if (!tenantId) {
            res.status(400).json({ success: false, message: 'Missing tenantId for live telemetry' });
            return;
        }
        const now = Date.now();
        const prev = exports.liveTelemetryStore.get(tenantId);
        const incomingChannels = req.body?.channels || {};
        const mergedChannels = { ...(prev?.channels || {}) };
        for (const [chKey, chVal] of Object.entries(incomingChannels)) {
            const chNum = Number(chKey);
            if (!Number.isFinite(chNum) || chNum < 1)
                continue;
            const val = chVal;
            mergedChannels[chNum] = {
                channel: chNum,
                detections: Array.isArray(val?.detections) ? val.detections : [],
                activeZones: Array.isArray(val?.activeZones) ? val.activeZones : [],
                fps: typeof val?.fps === 'number' ? val.fps : undefined,
                updatedAt: now,
            };
        }
        // Expire stale channels older than 18s so ghost detections never stick
        for (const [chKey, chObj] of Object.entries(mergedChannels)) {
            if (now - chObj.updatedAt > 18000) {
                mergedChannels[Number(chKey)] = { ...chObj, detections: [], activeZones: [] };
            }
        }
        const nextState = {
            tenantId,
            updatedAt: now,
            edgeVersion: req.body?.edgeVersion || prev?.edgeVersion || '2.0-fsd',
            dvrIp: req.body?.dvrIp || prev?.dvrIp,
            channels: mergedChannels,
            audio: {
                rms: typeof req.body?.audio?.rms === 'number' ? req.body.audio.rms : (prev?.audio?.rms || 0),
                speaking: Boolean(req.body?.audio?.speaking),
                lastTranscript: req.body?.audio?.lastTranscript !== undefined
                    ? req.body.audio.lastTranscript
                    : (prev?.audio?.lastTranscript || null),
            },
            galla: {
                state: req.body?.galla?.state === 'OPEN' ? 'OPEN' : 'CLOSED',
                lastOpenedAt: req.body?.galla?.lastOpenedAt ?? prev?.galla?.lastOpenedAt ?? null,
                lastBilled: req.body?.galla?.lastBilled ?? prev?.galla?.lastBilled ?? true,
            },
            unattendedAlert: req.body?.unattendedAlert ?? null,
            countersToday: req.body?.countersToday || prev?.countersToday,
        };
        exports.liveTelemetryStore.set(tenantId, nextState);
        if (server_1.io) {
            server_1.io.to(`tenant:${tenantId}:cameras`).emit('camera:live_telemetry', nextState);
        }
        res.json({ success: true, ts: now });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.pushLiveTelemetry = pushLiveTelemetry;
/**
 * GET /api/cameras/live-telemetry
 * Hydrates initial & polled live status for Web Dashboard + Android APK
 */
const getLiveTelemetry = async (req, res) => {
    try {
        const tenantObjId = req.tenantId;
        const tenantId = String(tenantObjId);
        const now = Date.now();
        const mem = exports.liveTelemetryStore.get(tenantId) || null;
        const edgeOnline = Boolean(mem && now - mem.updatedAt < 12000);
        // Check DVR Bridge frame freshness across tenant cameras
        const cams = await CameraDevice_1.CameraDevice.find({ tenantId: tenantObjId }).select('_id channel name status ipAddress').lean();
        const frameAgesMs = {};
        let freshCamerasCount = 0;
        for (const c of cams) {
            const cid = String(c._id);
            const cached = server_1.liveDvrFrameCache.get(cid);
            if (cached) {
                const age = now - cached.timestamp;
                frameAgesMs[cid] = age;
                if (age < 15000)
                    freshCamerasCount++;
            }
            else {
                frameAgesMs[cid] = null;
            }
        }
        // IST day start for today's live DB counters fallback
        const istNow = new Date(now + 5.5 * 3600 * 1000);
        const istDateStr = istNow.toISOString().split('T')[0];
        const dayStartUtc = new Date(`${istDateStr}T00:00:00+05:30`);
        const [lastBeat, latestAudio, todayVisitsAgg, todayGallaCount, unbilledGallaCount] = await Promise.all([
            RecorderHeartbeat_1.RecorderHeartbeat.findOne({ tenantId: tenantObjId }).sort({ at: -1 }).select('at').lean(),
            AudioTranscript_1.AudioTranscript.findOne({ tenantId: tenantObjId, timestamp: { $gte: dayStartUtc } })
                .sort({ timestamp: -1 })
                .select('text amounts items timestamp')
                .lean(),
            CameraAuditLog_1.CameraAuditLog.aggregate([
                {
                    $match: {
                        tenantId: tenantObjId,
                        eventType: 'FACE_VISIT',
                        timestamp: { $gte: dayStartUtc },
                        snapshotImage: { $not: /^(SCAN|AUDIO)_REQ:/ },
                    },
                },
                { $group: { _id: null, totalPeople: { $sum: { $ifNull: ['$visitCountToday', 1] } }, visits: { $sum: 1 } } },
            ]),
            CameraAuditLog_1.CameraAuditLog.countDocuments({
                tenantId: tenantObjId,
                eventType: { $in: ['GALLA_ALERT', 'CASH_DRAWER_MISMATCH'] },
                timestamp: { $gte: dayStartUtc },
            }),
            CameraAuditLog_1.CameraAuditLog.countDocuments({
                tenantId: tenantObjId,
                eventType: 'CASH_DRAWER_MISMATCH',
                timestamp: { $gte: dayStartUtc },
            }),
        ]);
        const hbAgeMs = lastBeat?.at ? now - new Date(lastBeat.at).getTime() : null;
        const recorderOnline = edgeOnline || (hbAgeMs !== null && hbAgeMs < 120000);
        const dbCustomers = todayVisitsAgg[0]?.totalPeople || 0;
        const fallbackTranscript = latestAudio
            ? {
                text: latestAudio.text || '',
                amounts: latestAudio.amounts || [],
                items: latestAudio.items || [],
                at: new Date(latestAudio.timestamp).toISOString(),
            }
            : null;
        res.json({
            success: true,
            serverTime: now,
            health: {
                edgeAiOnline: edgeOnline,
                recorderHeartbeatOnline: recorderOnline,
                lastHeartbeatAgeMs: hbAgeMs,
                dvrBridgeOnline: freshCamerasCount > 0,
                freshCamerasCount,
                totalConfiguredCameras: cams.length,
                frameAgesMs,
            },
            telemetry: mem
                ? {
                    ...mem,
                    audio: {
                        ...mem.audio,
                        lastTranscript: mem.audio.lastTranscript || fallbackTranscript,
                    },
                    countersToday: {
                        customers: Math.max(mem.countersToday?.customers || 0, dbCustomers),
                        gallaOpenings: Math.max(mem.countersToday?.gallaOpenings || 0, todayGallaCount),
                        matchedAudioAmt: mem.countersToday?.matchedAudioAmt || 0,
                        unbilledAlerts: Math.max(mem.countersToday?.unbilledAlerts || 0, unbilledGallaCount),
                    },
                }
                : {
                    tenantId,
                    updatedAt: lastBeat?.at ? new Date(lastBeat.at).getTime() : 0,
                    channels: {},
                    audio: {
                        rms: 0,
                        speaking: false,
                        lastTranscript: fallbackTranscript,
                    },
                    galla: {
                        state: 'CLOSED',
                        lastOpenedAt: null,
                        lastBilled: true,
                    },
                    unattendedAlert: null,
                    countersToday: {
                        customers: dbCustomers,
                        gallaOpenings: todayGallaCount,
                        matchedAudioAmt: 0,
                        unbilledAlerts: unbilledGallaCount,
                    },
                },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getLiveTelemetry = getLiveTelemetry;
