import { Schema, model, Types } from 'mongoose';

export type CameraLocationType = 
  | 'COUNTER_OCR'        // Points at weighing scale & milk analyzer
  | 'GALLA_SECURITY'     // Cash counter & cash drawer security
  | 'SHELF_INVENTORY'    // Grocery / Kirana products shelf
  | 'GATE_ENTRY'         // Vehicle & tanker number plate / entrance
  | 'CATTLE_SHED';       // Farm / shed monitoring

export interface ICameraDevice {
  tenantId: Types.ObjectId;
  name: string;
  deviceType: 'DVR' | 'NVR' | 'IP_CAMERA';
  brand: 'HIKVISION' | 'CP_PLUS' | 'DAHUA' | 'GENERIC_ONVIF';
  channelType: 'ANALOG' | 'IP';
  locationType: CameraLocationType;
  ipAddress: string;
  port: number;
  rtspPort?: number;
  username: string;
  password?: string;
  channel: number;
  streamType: 'main' | 'sub';
  snapshotUrl?: string;
  rtspUrl?: string;
  hikConnectSerial?: string;
  isActive: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  lastChecked?: Date;
  notes?: string;
}

const cameraDeviceSchema = new Schema<ICameraDevice>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  deviceType: { 
    type: String, 
    enum: ['DVR', 'NVR', 'IP_CAMERA'], 
    default: 'DVR',
    index: true 
  },
  brand: { 
    type: String, 
    enum: ['HIKVISION', 'CP_PLUS', 'DAHUA', 'GENERIC_ONVIF'], 
    default: 'HIKVISION' 
  },
  channelType: { 
    type: String, 
    enum: ['ANALOG', 'IP'], 
    default: 'ANALOG' 
  },
  locationType: { 
    type: String, 
    enum: ['COUNTER_OCR', 'GALLA_SECURITY', 'SHELF_INVENTORY', 'GATE_ENTRY', 'CATTLE_SHED'], 
    default: 'COUNTER_OCR',
    required: true 
  },
  ipAddress: { type: String, required: true },
  port: { type: Number, default: 80 },
  rtspPort: { type: Number, default: 554 },
  username: { type: String, default: 'admin' },
  password: { type: String, default: '' },
  channel: { type: Number, default: 1 },
  streamType: { type: String, enum: ['main', 'sub'], default: 'sub' },
  snapshotUrl: { type: String },
  rtspUrl: { type: String },
  hikConnectSerial: { type: String },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['ONLINE', 'OFFLINE', 'UNKNOWN'], default: 'UNKNOWN' },
  lastChecked: { type: Date },
  notes: { type: String }
}, { timestamps: true });

cameraDeviceSchema.index({ tenantId: 1, locationType: 1 });

export const CameraDevice = model<ICameraDevice>('CameraDevice', cameraDeviceSchema);
