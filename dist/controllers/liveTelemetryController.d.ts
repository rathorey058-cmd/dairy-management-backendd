import { Request, Response } from 'express';
export interface LiveTrackedDetection {
    trackId: string;
    className: string;
    role: 'CUSTOMER' | 'STAFF' | 'PASSERBY' | 'BIKE' | 'CAR' | 'CAN';
    confidence: number;
    box: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
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
            items: Array<{
                name: string;
                qty?: string | null;
                estPrice?: number | null;
            }>;
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
export declare const liveTelemetryStore: Map<string, TenantLiveTelemetry>;
/**
 * POST /api/cameras/live-telemetry
 * High-frequency (~1s) ingestion from Python Edge AI engine (`edge_detector.py`)
 */
export declare const pushLiveTelemetry: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/cameras/live-telemetry
 * Hydrates initial & polled live status for Web Dashboard + Android APK
 */
export declare const getLiveTelemetry: (req: Request, res: Response) => Promise<void>;
