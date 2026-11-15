import { Request, Response } from 'express';
/**
 * Get all configured cameras
 */
export declare const getCameras: (req: Request, res: Response) => Promise<void>;
/**
 * Add or update a camera device
 */
export declare const saveCamera: (req: Request, res: Response) => Promise<void>;
/**
 * Delete a camera device
 */
export declare const deleteCamera: (req: Request, res: Response) => Promise<void>;
/**
 * Test connection to a camera (Supports DVR, NVR, CP Plus & Hikvision)
 */
export declare const testCameraConnection: (req: Request, res: Response) => Promise<void>;
/**
 * Capture frame and execute Gemini Vision OCR for Weight and Fat machine
 */
export declare const captureAndAnalyzeOCR: (req: Request, res: Response) => Promise<void>;
/**
 * Compare AI reading vs Operator manual input for Dual Verification
 */
export declare const verifyDualAudit: (req: Request, res: Response) => Promise<void>;
/**
 * Kirana & Grocery Shelf Scan
 */
export declare const scanShelfInventory: (req: Request, res: Response) => Promise<void>;
/**
 * Person / Face Detection & Footfall visit count
 */
export declare const detectPersonAndVisits: (req: Request, res: Response) => Promise<void>;
/**
 * Get AI Accuracy Scorecard and Audit Logs
 */
export declare const getAuditLogs: (req: Request, res: Response) => Promise<void>;
/**
 * Get all Kirana Shelf Blocks
 */
export declare const getShelfBlocks: (req: Request, res: Response) => Promise<void>;
/**
 * Save or Update a Kirana Shelf Block
 */
export declare const saveShelfBlock: (req: Request, res: Response) => Promise<void>;
/**
 * Delete a Kirana Shelf Block
 */
export declare const deleteShelfBlock: (req: Request, res: Response) => Promise<void>;
/**
 * Instant Farmer Token / Barcode Resolver for Counter
 */
export declare const resolveFarmerToken: (req: Request, res: Response) => Promise<void>;
/**
 * Get direct live JPEG snapshot from camera for live feed in browser
 */
export declare const getLiveCameraSnapshot: (req: Request, res: Response) => Promise<void>;
/**
 * Get Ultra-Crisp Actionable Incidents
 */
export declare const getUltraCrispIncidents: (req: Request, res: Response) => Promise<void>;
/**
 * Update Ultra-Crisp Incident Status (CLEARED_SAFE or FLAGGED_THEFT)
 */
export declare const updateIncidentStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Zero-Cost Local/Edge Rule Evaluation Engine
 * Runs instantly on edge / client signals without expensive cloud bills!
 */
export declare const evaluateEdgeRules: (req: Request, res: Response) => Promise<void>;
/**
 * DPDP Act 2023 Compliance & Retention Status
 */
export declare const getDpdpComplianceStatus: (req: Request, res: Response) => Promise<void>;
/**
 * DPDP Act 2023 Data Purge - Deletes expired video incident recordings
 */
export declare const purgeExpiredData: (req: Request, res: Response) => Promise<void>;
