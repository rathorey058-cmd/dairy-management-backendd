import { Types, Document } from 'mongoose';
export type ShopAiSourceType = 'VIDEO_UPLOAD' | 'LIVE_STREAM_AUDIT' | 'AUDIO_RECORDING' | 'SNAPSHOT_AUDIT';
export interface IShopAiTranscript {
    speaker: string;
    timeCode?: string;
    text: string;
    intent?: string;
}
export interface IShopAiReport extends Document {
    tenantId: Types.ObjectId;
    title: string;
    sourceType: ShopAiSourceType;
    mediaType: 'video' | 'audio' | 'image';
    mediaThumbnail?: string;
    mediaDuration?: string;
    userContextPrompt?: string;
    cameraName?: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    customerCount: {
        total: number;
        men: number;
        women: number;
        children: number;
        notes: string;
    };
    staffPerformance: {
        staffIdentified: string[];
        attendanceStatus: string;
        activeScore: number;
        behaviorNotes: string;
        unattendedLapses: string[];
    };
    voiceAnalysis: {
        languageDetected: string;
        audioSummary: string;
        transcripts: IShopAiTranscript[];
    };
    businessTransactions: {
        estimatedTransactionsCount: number;
        itemsDiscussedOrSold: string[];
        cashCounterObservations: string;
    };
    aiBrainInsights: {
        positives: string[];
        concernsOrAlerts: string[];
        actionableSuggestions: string[];
        anomalyDetected: boolean;
    };
    writtenFullReport: string;
    rawSummary: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShopAiReport: import("mongoose").Model<IShopAiReport, {}, {}, {}, Document<unknown, {}, IShopAiReport, {}, import("mongoose").DefaultSchemaOptions> & IShopAiReport & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IShopAiReport>;
