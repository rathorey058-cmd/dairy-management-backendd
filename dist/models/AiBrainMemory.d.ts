import { Types, Document } from 'mongoose';
/**
 * PERMANENT AI BRAIN MEMORY COLLECTION
 * NOTE: Strictly separated from CameraAuditLog so 30-day DPDP CCTV log purges NEVER delete learned AI knowledge.
 */
export interface IAiBrainMemory extends Document {
    tenantId: Types.ObjectId;
    kind: 'LEARNED_OBJECT' | 'LEARNED_PERSON' | 'ROUTINE_BASELINE';
    label: string;
    channel: number;
    featureVector: number[];
    box?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    thumbnailBase64?: string;
    objectCategory?: 'CAN' | 'PATILA' | 'CRATE' | 'PACKET' | 'SCALE' | 'GALLA_OPEN' | 'GALLA_CLOSED' | 'STAFF_UNIFORM' | 'IGNORE' | 'CUSTOM';
    verifiedByOwner?: boolean;
    matchCount?: number;
    clusterCode?: string;
    personRole?: 'NEW_VISITOR' | 'REGULAR_CUSTOMER' | 'STAFF' | 'FARMER';
    isNameConfirmed?: boolean;
    lockedByOwner?: boolean;
    visitCount?: number;
    visitDays?: string[];
    typicalHours?: number[];
    usualItems?: string[];
    candidateNames?: Array<{
        name: string;
        votes: number;
        source: 'AUDIO_VOCATIVE' | 'POS_BILL' | 'OWNER';
        lastHeardAt: Date;
    }>;
    lastSeenAt?: Date;
    routineStats?: {
        modelVersion: number;
        accuracyScore: number;
        totalFramesTrained: number;
        totalVideosTrained: number;
        hourlyCustomerBaseline: number[];
        hourlyGallaBaseline: number[];
        daysObserved: number;
        learnedVocabulary: string[];
        recentAnomalies: Array<{
            at: Date;
            severity: 'INFO' | 'WARN' | 'HIGH';
            title: string;
            detail: string;
            channel?: number;
        }>;
        lastNightlyTrainAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const AiBrainMemory: import("mongoose").Model<IAiBrainMemory, {}, {}, {}, Document<unknown, {}, IAiBrainMemory, {}, import("mongoose").DefaultSchemaOptions> & IAiBrainMemory & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAiBrainMemory>;
