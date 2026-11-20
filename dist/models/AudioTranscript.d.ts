import { Types, Document } from 'mongoose';
/** Speech captured at the counter mic (transcribed on the shop device). */
export interface IAudioTranscript extends Document {
    tenantId: Types.ObjectId;
    channel: number;
    timestamp: Date;
    durationSec: number;
    text: string;
    amounts: number[];
    items: {
        name: string;
        qty?: string;
    }[];
    source: 'LIVE' | 'DVR_HDD';
    confidence?: number;
}
export declare const AudioTranscript: import("mongoose").Model<IAudioTranscript, {}, {}, {}, Document<unknown, {}, IAudioTranscript, {}, import("mongoose").DefaultSchemaOptions> & IAudioTranscript & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAudioTranscript>;
