import { Types } from 'mongoose';
export type CameraAuditEventType = 'MILK_OCR_AUDIT' | 'FACE_VISIT' | 'GALLA_ALERT' | 'SHELF_SCAN' | 'FRIDGE_ACCESS' | 'CURRENCY_DETECT' | 'SECURITY_EVENT' | 'CASH_DRAWER_MISMATCH' | 'DELTA_COIN_MISMATCH' | 'HAND_TO_POCKET' | 'HAND_TO_MOUTH' | 'COUNTER_CROSSING' | 'MULTI_MIC_ALERT';
export interface IUltraCrispIncident {
    timeCode: string;
    alertType: string;
    amountOrItem: string;
    rootCause: string;
    confidence: number;
    videoClipUrl?: string;
    audioVerified: boolean;
    micChannel?: string;
    status: 'PENDING_REVIEW' | 'FLAGGED_THEFT' | 'CLEARED_SAFE';
}
export interface ICameraAuditLog {
    tenantId: Types.ObjectId;
    camera?: Types.ObjectId;
    eventType: CameraAuditEventType;
    timestamp: Date;
    farmer?: Types.ObjectId;
    personName?: string;
    farmerIdCode?: string;
    visitCountToday: number;
    aiReading?: {
        weight?: number;
        fat?: number;
        snf?: number;
        clr?: number;
        confidence?: number;
        rawText?: string;
    };
    operatorReading?: {
        weight?: number;
        fat?: number;
        snf?: number;
    };
    isMismatched: boolean;
    mismatchReason?: string;
    weightVariance?: number;
    fatVariance?: number;
    shelfBlock?: string;
    detectedCount?: number;
    currencyDetails?: {
        notesDetected?: {
            note: string;
            count: number;
        }[];
        totalEstimatedCash?: number;
        drawerStatus?: 'OPENED' | 'CLOSED' | 'TAMPERED';
        activeBillAmount?: number;
        coinsDeltaCalculated?: number;
    };
    fridgeDetails?: {
        action?: 'DOOR_OPEN' | 'ITEM_REMOVED' | 'ITEM_ADDED' | 'DOOR_CLOSE';
        itemsAffected?: string[];
        isNightAlert?: boolean;
    };
    incident?: IUltraCrispIncident;
    snapshotImage?: string;
    videoClipUrl?: string;
    audioClipUrl?: string;
    videoZone?: string;
    aiAnalysis?: {
        audioQuote?: string;
        requestedItem?: string;
        givenItem?: string;
        amountPaid?: number;
        cashHandedOver?: boolean;
        analystSummary?: string;
        model?: string;
        analyzedAt?: Date;
    };
    status: 'VERIFIED' | 'MISMATCH' | 'RESOLVED' | 'INFO';
    operatorUser?: Types.ObjectId;
    notes?: string;
}
export declare const CameraAuditLog: import("mongoose").Model<ICameraAuditLog, {}, {}, {}, import("mongoose").Document<unknown, {}, ICameraAuditLog, {}, import("mongoose").DefaultSchemaOptions> & ICameraAuditLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICameraAuditLog>;
