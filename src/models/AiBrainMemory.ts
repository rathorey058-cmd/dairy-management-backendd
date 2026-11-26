import { Schema, model, Types, Document } from 'mongoose';

/**
 * PERMANENT AI BRAIN MEMORY COLLECTION
 * NOTE: Strictly separated from CameraAuditLog so 30-day DPDP CCTV log purges NEVER delete learned AI knowledge.
 */
export interface IAiBrainMemory extends Document {
  tenantId: Types.ObjectId;
  kind: 'LEARNED_OBJECT' | 'LEARNED_PERSON' | 'ROUTINE_BASELINE';

  // Common fields
  label: string;
  channel: number;
  featureVector: number[];
  box?: { x: number; y: number; width: number; height: number };
  thumbnailBase64?: string;

  // LEARNED_OBJECT fields
  objectCategory?: 'CAN' | 'PATILA' | 'CRATE' | 'PACKET' | 'SCALE' | 'GALLA_OPEN' | 'GALLA_CLOSED' | 'STAFF_UNIFORM' | 'IGNORE' | 'CUSTOM';
  verifiedByOwner?: boolean;
  matchCount?: number;

  // LEARNED_PERSON (Self-Supervised Face/Appearance Cluster + Spoken Name Discovery)
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

  // ROUTINE_BASELINE (Singleton per tenant for daily learning stats & anomaly baselines)
  routineStats?: {
    modelVersion: number;
    accuracyScore: number;
    totalFramesTrained: number;
    totalVideosTrained: number;
    hourlyCustomerBaseline: number[]; // 24 hours (0..23 IST)
    hourlyGallaBaseline: number[];    // 24 hours (0..23 IST)
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

const aiBrainMemorySchema = new Schema<IAiBrainMemory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    kind: {
      type: String,
      enum: ['LEARNED_OBJECT', 'LEARNED_PERSON', 'ROUTINE_BASELINE'],
      required: true,
      index: true,
    },
    label: { type: String, required: true, trim: true },
    channel: { type: Number, default: 1 },
    featureVector: { type: [Number], default: [] },
    box: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 0.2 },
      height: { type: Number, default: 0.2 },
    },
    thumbnailBase64: { type: String },

    objectCategory: { type: String, default: 'CUSTOM' },
    verifiedByOwner: { type: Boolean, default: false },
    matchCount: { type: Number, default: 1 },

    clusterCode: { type: String, index: true },
    personRole: { type: String, default: 'NEW_VISITOR' },
    isNameConfirmed: { type: Boolean, default: false },
    lockedByOwner: { type: Boolean, default: false },
    visitCount: { type: Number, default: 1 },
    visitDays: { type: [String], default: [] },
    typicalHours: { type: [Number], default: [] },
    usualItems: { type: [String], default: [] },
    candidateNames: [
      {
        name: { type: String, required: true },
        votes: { type: Number, default: 1 },
        source: { type: String, default: 'AUDIO_VOCATIVE' },
        lastHeardAt: { type: Date, default: Date.now },
      },
    ],
    lastSeenAt: { type: Date, default: Date.now },

    routineStats: {
      modelVersion: { type: Number, default: 1.0 },
      accuracyScore: { type: Number, default: 86.0 },
      totalFramesTrained: { type: Number, default: 0 },
      totalVideosTrained: { type: Number, default: 0 },
      hourlyCustomerBaseline: { type: [Number], default: () => Array(24).fill(0) },
      hourlyGallaBaseline: { type: [Number], default: () => Array(24).fill(0) },
      daysObserved: { type: Number, default: 1 },
      learnedVocabulary: { type: [String], default: [] },
      recentAnomalies: [
        {
          at: { type: Date, default: Date.now },
          severity: { type: String, default: 'WARN' },
          title: { type: String },
          detail: { type: String },
          channel: { type: Number },
        },
      ],
      lastNightlyTrainAt: { type: Date },
    },
  },
  { timestamps: true }
);

aiBrainMemorySchema.index({ tenantId: 1, kind: 1 });

export const AiBrainMemory = model<IAiBrainMemory>('AiBrainMemory', aiBrainMemorySchema);
