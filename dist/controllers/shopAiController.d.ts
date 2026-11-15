import { Request, Response } from 'express';
/**
 * 1. Analyze Uploaded Video / Audio / CCTV Recording with Custom Context
 */
export declare const analyzeMediaUpload: (req: Request, res: Response) => Promise<void>;
/**
 * 2. Live Stream Snapshot & Real-Time Audio Audit
 */
export declare const auditLiveStreamSnapshot: (req: Request, res: Response) => Promise<void>;
/**
 * 3. Get Shop AI Reports History & Metrics
 */
export declare const getShopAiReports: (req: Request, res: Response) => Promise<void>;
/**
 * 4. Get Single Report Detail
 */
export declare const getShopAiReportById: (req: Request, res: Response) => Promise<void>;
/**
 * 5. Delete Shop AI Report
 */
export declare const deleteShopAiReport: (req: Request, res: Response) => Promise<void>;
/**
 * 6. Generate Complete Daily AI Intelligence Report for any date (e.g. Yesterday)
 */
export declare const generateDailyAiReport: (req: Request, res: Response) => Promise<void>;
