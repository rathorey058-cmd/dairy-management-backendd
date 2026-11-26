import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { io, liveDvrFrameCache } from '../server';
import { CameraAuditLog } from '../models/CameraAuditLog';
import { AudioTranscript } from '../models/AudioTranscript';
import { RecorderHeartbeat } from '../models/RecorderHeartbeat';
import { CameraDevice } from '../models/CameraDevice';

export interface LiveTrackedDetection {
  trackId: string;
  className: string;
  role: 'CUSTOMER' | 'STAFF' | 'PASSERBY' | 'BIKE' | 'CAR' | 'CAN';
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  dwellSec: number;
  cropDataUrl?: string;
}

export interface ChannelLiveTelemetry {
  channel: number;
  detections: LiveTrackedDetection[];
  activeZones: string[];
  fps?: number;
  updatedAt: number;
}

export interface TenantLiveTelemetry {
  tenantId: string;
  updatedAt: number;
  edgeVersion?: string;
  dvrIp?: string;
  channels: Record<number, ChannelLiveTelemetry>;
  audio: {
    rms: number;
    speaking: boolean;
    lastTranscript?: {
      text: string;
      amounts: number[];
      items: Array<{ name: string; qty?: string | null; estPrice?: number | null }>;
      at: string;
    } | null;
  };
  galla: {
    state: 'OPEN' | 'CLOSED';
    lastOpenedAt?: string | null;
    lastBilled?: boolean;
  };
  unattendedAlert?: {
    active: boolean;
    waitSec: number;
    customerCount: number;
    message: string;
  } | null;
  countersToday?: {
    customers: number;
    gallaOpenings: number;
    matchedAudioAmt: number;
    unbilledAlerts: number;
  };
}

export const liveTelemetryStore = new Map<string, TenantLiveTelemetry>();

function resolveTenantIdFromReq(req: Request): string | null {
  if ((req as any).tenantId) return String((req as any).tenantId);
  if (req.body?.tenantId && Types.ObjectId.isValid(String(req.body.tenantId))) {
    return String(req.body.tenantId);
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const secret = process.env.JWT_SECRET || 'dairy-smart-ai-super-secret-key';
      const decoded: any = jwt.verify(authHeader.split(' ')[1], secret);
      if (decoded?.tenantId) return String(decoded.tenantId);
    } catch {
      // ignore token error for local edge push if tenantId was provided
    }
  }
  return null;
}

/**
 * POST /api/cameras/live-telemetry
 * High-frequency (~1s) ingestion from Python Edge AI engine (`edge_detector.py`)
 */
export const pushLiveTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = resolveTenantIdFromReq(req);
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Missing tenantId for live telemetry' });
      return;
    }

    const now = Date.now();
    const prev = liveTelemetryStore.get(tenantId);
    const incomingChannels = req.body?.channels || {};
    const mergedChannels: Record<number, ChannelLiveTelemetry> = { ...(prev?.channels || {}) };

    for (const [chKey, chVal] of Object.entries(incomingChannels)) {
      const chNum = Number(chKey);
      if (!Number.isFinite(chNum) || chNum < 1) continue;
      const val = chVal as any;
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

    const nextState: TenantLiveTelemetry = {
      tenantId,
      updatedAt: now,
      edgeVersion: req.body?.edgeVersion || prev?.edgeVersion || '2.0-fsd',
      dvrIp: req.body?.dvrIp || prev?.dvrIp,
      channels: mergedChannels,
      audio: {
        rms: typeof req.body?.audio?.rms === 'number' ? req.body.audio.rms : (prev?.audio?.rms || 0),
        speaking: Boolean(req.body?.audio?.speaking),
        lastTranscript:
          req.body?.audio?.lastTranscript !== undefined
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

    liveTelemetryStore.set(tenantId, nextState);

    if (io) {
      io.to(`tenant:${tenantId}:cameras`).emit('camera:live_telemetry', nextState);
    }

    res.json({ success: true, ts: now });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/cameras/live-telemetry
 * Hydrates initial & polled live status for Web Dashboard + Android APK
 */
export const getLiveTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantObjId = (req as any).tenantId;
    const tenantId = String(tenantObjId);
    const now = Date.now();

    const mem = liveTelemetryStore.get(tenantId) || null;
    const edgeOnline = Boolean(mem && now - mem.updatedAt < 12000);

    // Check DVR Bridge frame freshness across tenant cameras
    const cams = await CameraDevice.find({ tenantId: tenantObjId }).select('_id channel name status ipAddress').lean();
    const frameAgesMs: Record<string, number | null> = {};
    let freshCamerasCount = 0;

    for (const c of cams) {
      const cid = String(c._id);
      const cached = liveDvrFrameCache.get(cid);
      if (cached) {
        const age = now - cached.timestamp;
        frameAgesMs[cid] = age;
        if (age < 15000) freshCamerasCount++;
      } else {
        frameAgesMs[cid] = null;
      }
    }

    // IST day start for today's live DB counters fallback
    const istNow = new Date(now + 5.5 * 3600 * 1000);
    const istDateStr = istNow.toISOString().split('T')[0];
    const dayStartUtc = new Date(`${istDateStr}T00:00:00+05:30`);

    const [lastBeat, latestAudio, todayVisitsAgg, todayGallaCount, unbilledGallaCount] = await Promise.all([
      RecorderHeartbeat.findOne({ tenantId: tenantObjId }).sort({ at: -1 }).select('at').lean(),
      AudioTranscript.findOne({ tenantId: tenantObjId, timestamp: { $gte: dayStartUtc } })
        .sort({ timestamp: -1 })
        .select('text amounts items timestamp')
        .lean(),
      CameraAuditLog.aggregate([
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
      CameraAuditLog.countDocuments({
        tenantId: tenantObjId,
        eventType: { $in: ['GALLA_ALERT', 'CASH_DRAWER_MISMATCH'] },
        timestamp: { $gte: dayStartUtc },
      }),
      CameraAuditLog.countDocuments({
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
          text: (latestAudio as any).text || '',
          amounts: (latestAudio as any).amounts || [],
          items: (latestAudio as any).items || [],
          at: new Date((latestAudio as any).timestamp).toISOString(),
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
