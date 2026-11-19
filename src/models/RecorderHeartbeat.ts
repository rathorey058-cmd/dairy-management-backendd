import { Schema, model, Types, Document } from 'mongoose';

/**
 * One document per minute in which the 24/7 AI recorder was alive.
 * Lets reports say honestly "recorder was OFF" instead of showing a fake 0.
 */
export interface IRecorderHeartbeat extends Document {
  tenantId: Types.ObjectId;
  minute: number; // floor(epoch ms / 60000)
  at: Date;
}

const schema = new Schema<IRecorderHeartbeat>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  minute: { type: Number, required: true },
  at: { type: Date, default: Date.now },
});

schema.index({ tenantId: 1, minute: 1 }, { unique: true });
// auto-clean after 90 days
schema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const RecorderHeartbeat = model<IRecorderHeartbeat>('RecorderHeartbeat', schema);
