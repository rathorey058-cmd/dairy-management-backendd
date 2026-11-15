/**
 * Camera & Computer Vision AI Service for Dairy App
 * Supports:
 * 1. Hikvision IP Camera / NVR ISAPI HTTP Digest Authentication & snapshot capture
 * 2. Google Gemini 1.5 Flash Vision Multimodal OCR for Weighing Scales & Milk Analyzers
 * 3. Kirana Shelf & Block Inventory Scanning
 * 4. Person & Footfall Face Recognition & Visit Logging
 * 5. Dual-Audit Mismatch Analysis (AI vs Human Entry)
 */
import { ICameraDevice } from '../models/CameraDevice';
export interface MilkOcrResult {
    weight: number | null;
    fat: number | null;
    snf: number | null;
    clr: number | null;
    confidence: number;
    rawDetectedText: string;
    farmerTag: string | null;
    notes: string;
    isAiPowered: boolean;
}
export interface ShelfScanItem {
    blockCode: string;
    productName: string;
    detectedCount: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'EMPTY' | 'MISPLACED';
    confidence: number;
    details: string;
}
export interface ShelfScanResult {
    scannedBlocks: ShelfScanItem[];
    totalItemsVisible: number;
    summary: string;
    isAiPowered: boolean;
}
export interface PersonDetectResult {
    detectedPerson: {
        matchedFarmerId?: string;
        matchedName?: string;
        tokenNumber?: string;
        confidence: number;
        description: string;
    } | null;
    faceCount: number;
    isAiPowered: boolean;
}
/**
 * Helper to generate candidate snapshot paths for DVR, NVR, or IP camera
 */
export declare const getDeviceCandidatePaths: (camera: ICameraDevice) => string[];
/**
 * Fetch snapshot from a single HTTP path with Digest/Basic auth support
 */
export declare const fetchSinglePathBuffer: (ip: string, port: number, path: string, username: string, password: string) => Promise<{
    buffer: Buffer;
    contentType: string;
}>;
/**
 * Fetch snapshot from DVR, NVR, or IP Camera with Automatic Multi-Path Probing
 */
export declare const fetchHikvisionSnapshotBuffer: (camera: ICameraDevice) => Promise<{
    buffer: Buffer;
    contentType: string;
    workingPath?: string;
}>;
/**
 * Fetch snapshot as Base64 Data URL (supports DVR, NVR & IP cameras)
 */
export declare const fetchHikvisionSnapshot: (camera: ICameraDevice) => Promise<string>;
/**
 * Perform Gemini Vision OCR on Weighing Scale and Fat Machine displays
 * STRICT ZERO-FAKE-DATA POLICY:
 * Returns null if no actual scale/fat machine display is visible.
 */
export declare const performGeminiMilkOCR: (rawImage: string, customApiKey?: string) => Promise<MilkOcrResult>;
/**
 * Perform Gemini Vision Shelf & Kirana Inventory Inspection
 */
export declare const performGeminiShelfScan: (rawImage: string, existingBlocks: any[], customApiKey?: string) => Promise<ShelfScanResult>;
/**
 * Perform Face / Person Detection and Footfall Recognition
 */
export declare const performGeminiPersonDetect: (rawImage: string, knownFarmers: Array<{
    _id: string;
    farmerId: string;
    name: string;
    tokenNumber?: string;
}>, customApiKey?: string) => Promise<PersonDetectResult>;
/**
 * Compare AI reading vs Operator Manual input to detect fraud or misreadings
 */
export declare const compareReadings: (aiReading: {
    weight?: number | null;
    fat?: number | null;
    snf?: number | null;
}, operatorReading: {
    weight?: number | null;
    fat?: number | null;
    snf?: number | null;
}) => {
    isMismatched: boolean;
    mismatchReason: string;
    weightVariance: number;
    fatVariance: number;
    snfVariance: number;
};
