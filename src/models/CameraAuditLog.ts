import { Schema, model, Types } from 'mongoose';

export type CameraAuditEventType = 
  | 'MILK_OCR_AUDIT'       // Comparison between AI detection vs Operator manual entry
  | 'FACE_VISIT'           // Farmer or customer presence log & visit count
  | 'GALLA_ALERT'          // Cash counter movement/access
  | 'SHELF_SCAN'           // Grocery rack AI inventory audit
  | 'FRIDGE_ACCESS'        // Refrigerator opened / item taken
  | 'CURRENCY_DETECT'      // Indian Rupee notes detected
  | 'SECURITY_EVENT'       // General security event
  | 'CASH_DRAWER_MISMATCH' // Cash taken out without active bill (Gandhi note + bill delta)
  | 'DELTA_COIN_MISMATCH'  // Coins = Note inserted - Bill amount calculation
  | 'HAND_TO_POCKET'       // Theft gesture detection via Pose tracking
  | 'HAND_TO_MOUTH'        // Unauthorized consumption at counter/fridge
  | 'COUNTER_CROSSING'     // Sweethearting / Free item passed without billing
  | 'MULTI_MIC_ALERT';     // Counter mic vs cash drawer mic time-sync audio spike

export interface IUltraCrispIncident {
  timeCode: string;          // e.g. "14:22:15"
  alertType: string;         // e.g. "🚨 गल्ला चोरी (Cash Mismatch)"
  amountOrItem: string;      // e.g. "₹500 का नोट निकला | बिल: ₹0"
  rootCause: string;         // e.g. "गल्ला खुला पर POS पर कोई सक्रिय बिक्री नहीं"
  confidence: number;        // e.g. 98
  videoClipUrl?: string;     // URL or base64 10s video replay
  audioVerified: boolean;    // Mic audio correlation confirmed
  micChannel?: string;       // "Counter Mic" | "Cash Drawer Mic"
  status: 'PENDING_REVIEW' | 'FLAGGED_THEFT' | 'CLEARED_SAFE';
}

export interface ICameraAuditLog {
  tenantId: Types.ObjectId;
  camera?: Types.ObjectId;
  eventType: CameraAuditEventType;
  timestamp: Date;
  
  // Person / Farmer Tracking
  farmer?: Types.ObjectId;
  personName?: string;
  farmerIdCode?: string;
  visitCountToday: number;
  
  // Dual-Audit Milk Collection Data
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

  // Shelf Scan Data
  shelfBlock?: string;
  detectedCount?: number;

  // Currency & Galla Detection Data
  currencyDetails?: {
    notesDetected?: { note: string; count: number }[];
    totalEstimatedCash?: number;
    drawerStatus?: 'OPENED' | 'CLOSED' | 'TAMPERED';
    activeBillAmount?: number;
    coinsDeltaCalculated?: number;
  };

  // Refrigerator / Deep Fridge Data
  fridgeDetails?: {
    action?: 'DOOR_OPEN' | 'ITEM_REMOVED' | 'ITEM_ADDED' | 'DOOR_CLOSE';
    itemsAffected?: string[];
    isNightAlert?: boolean;
  };

  // Ultra-Crisp Actionable Incident Details
  incident?: IUltraCrispIncident;

  // Visual & Audio Proof
  snapshotImage?: string; // base64 or relative url
  videoClipUrl?: string;  // 10s video buffer replay
  audioClipUrl?: string;
  status: 'VERIFIED' | 'MISMATCH' | 'RESOLVED' | 'INFO';
  operatorUser?: Types.ObjectId; // Ref User who was at counter
  notes?: string;
}

const ultraCrispIncidentSchema = new Schema<IUltraCrispIncident>({
  timeCode: { type: String, required: true },
  alertType: { type: String, required: true },
  amountOrItem: { type: String, required: true },
  rootCause: { type: String, required: true },
  confidence: { type: Number, default: 95 },
  videoClipUrl: { type: String },
  audioVerified: { type: Boolean, default: false },
  micChannel: { type: String, default: 'Counter Mic' },
  status: { type: String, enum: ['PENDING_REVIEW', 'FLAGGED_THEFT', 'CLEARED_SAFE'], default: 'PENDING_REVIEW' }
}, { _id: false });

const cameraAuditLogSchema = new Schema<ICameraAuditLog>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  camera: { type: Schema.Types.ObjectId, ref: 'CameraDevice' },
  eventType: { 
    type: String, 
    enum: [
      'MILK_OCR_AUDIT', 'FACE_VISIT', 'GALLA_ALERT', 'SHELF_SCAN', 'FRIDGE_ACCESS', 
      'CURRENCY_DETECT', 'SECURITY_EVENT', 'CASH_DRAWER_MISMATCH', 'DELTA_COIN_MISMATCH',
      'HAND_TO_POCKET', 'HAND_TO_MOUTH', 'COUNTER_CROSSING', 'MULTI_MIC_ALERT'
    ], 
    required: true,
    index: true 
  },
  timestamp: { type: Date, default: Date.now, index: true },
  
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer' },
  personName: { type: String },
  farmerIdCode: { type: String },
  visitCountToday: { type: Number, default: 1 },

  aiReading: {
    weight: { type: Number },
    fat: { type: Number },
    snf: { type: Number },
    clr: { type: Number },
    confidence: { type: Number },
    rawText: { type: String }
  },
  operatorReading: {
    weight: { type: Number },
    fat: { type: Number },
    snf: { type: Number }
  },
  isMismatched: { type: Boolean, default: false, index: true },
  mismatchReason: { type: String },
  weightVariance: { type: Number },
  fatVariance: { type: Number },

  shelfBlock: { type: String },
  detectedCount: { type: Number },

  currencyDetails: {
    notesDetected: [{
      note: { type: String },
      count: { type: Number }
    }],
    totalEstimatedCash: { type: Number },
    drawerStatus: { type: String, enum: ['OPENED', 'CLOSED', 'TAMPERED'], default: 'CLOSED' },
    activeBillAmount: { type: Number, default: 0 },
    coinsDeltaCalculated: { type: Number, default: 0 }
  },

  fridgeDetails: {
    action: { type: String, enum: ['DOOR_OPEN', 'ITEM_REMOVED', 'ITEM_ADDED', 'DOOR_CLOSE'] },
    itemsAffected: [{ type: String }],
    isNightAlert: { type: Boolean, default: false }
  },

  incident: ultraCrispIncidentSchema,

  snapshotImage: { type: String },
  videoClipUrl: { type: String },
  audioClipUrl: { type: String },
  status: { 
    type: String, 
    enum: ['VERIFIED', 'MISMATCH', 'RESOLVED', 'INFO'], 
    default: 'INFO',
    index: true 
  },
  operatorUser: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

cameraAuditLogSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });
cameraAuditLogSchema.index({ tenantId: 1, personName: 1, timestamp: -1 });

export const CameraAuditLog = model<ICameraAuditLog>('CameraAuditLog', cameraAuditLogSchema);
