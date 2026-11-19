import { Schema, model, Types, Document } from 'mongoose';

/** Speech captured at the counter mic (transcribed on the shop device). */
export interface IAudioTranscript extends Document {
  tenantId: Types.ObjectId;
  channel: number;
  timestamp: Date;
  durationSec: number;
  text: string;
  amounts: number[];          // rupee amounts heard
  items: { name: string; qty?: string }[];
  source: 'LIVE' | 'DVR_HDD';
  confidence?: number;
}

const schema = new Schema<IAudioTranscript>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  channel: { type: Number, default: 1 },
  timestamp: { type: Date, required: true },
  durationSec: { type: Number, default: 0 },
  text: { type: String, default: '' },
  amounts: { type: [Number], default: [] },
  items: { type: [{ name: String, qty: String, _id: false }], default: [] },
  source: { type: String, enum: ['LIVE', 'DVR_HDD'], default: 'LIVE' },
  confidence: { type: Number },
});

schema.index({ tenantId: 1, timestamp: -1 });

export const AudioTranscript = model<IAudioTranscript>('AudioTranscript', schema);
