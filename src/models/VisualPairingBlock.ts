import { Schema, model, Types } from 'mongoose';

export type PairingBlockCategory = 
  | 'GALLA'             // Cash counter & cash drawer (High Security)
  | 'REUSABLE_CAN'      // Reusable Milk Cans / Tanks (Gate IN/OUT tracking)
  | 'SHELF'             // Product Shelf / Rack (Pick counter)
  | 'GATE_TRIPWIRE'     // Entry/Exit Gate Tripwire Line
  | 'MACHINERY'         // Processing equipment / Chiller / Cream separator
  | 'CUSTOM';           // Any custom tagged asset

export interface IVisualPairingBlock {
  tenantId: Types.ObjectId;
  blockCode: string;          // E.g. "BLK-01", "GALLA-01", "CAN-01"
  name: string;               // E.g. "मुख्य गल्ला (Cash Drawer)", "50L मिल्क कैन", "घी-पनीर शेल्फ"
  category: PairingBlockCategory;
  color: string;              // Hex color e.g. "#EF4444", "#10B981", "#3B82F6", etc.
  barcode?: string;           // Physical Barcode / QR sticker text
  cameraChannel: number;      // Channel 1, 2, 3, 4, 5
  coordinates: {
    x: number;                // 0 to 100 percentage
    y: number;                // 0 to 100 percentage
    width: number;            // 0 to 100 percentage
    height: number;           // 0 to 100 percentage
  };
  tripwireConfig?: {
    type: 'BI_DIRECTIONAL' | 'OUT_ONLY' | 'IN_ONLY';
    lineInY: number;          // Green IN line Y coordinate
    lineOutY: number;         // Red OUT line Y coordinate
    alertOnMissingAtEOD: boolean;
  };
  shelfConfig?: {
    pickCount: number;        // How many times items were picked
    capacity: number;
    lastPickAt?: Date;
  };
  gateStatus?: {
    status: 'INSIDE_SHOP' | 'OUTSIDE_SHOP' | 'IN_TRANSIT';
    lastExitTime?: Date;
    lastReturnTime?: Date;
    exitCountToday: number;
    returnCountToday: number;
  };
  status: 'ACTIVE' | 'DISPLACED' | 'OUT_OF_SHOP' | 'MISSING';
  totalPicks: number;
  lastDetectedAt?: Date;
  notes?: string;
}

const visualPairingBlockSchema = new Schema<IVisualPairingBlock>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  blockCode: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['GALLA', 'REUSABLE_CAN', 'SHELF', 'GATE_TRIPWIRE', 'MACHINERY', 'CUSTOM'], 
    default: 'CUSTOM',
    required: true 
  },
  color: { type: String, default: '#3B82F6' },
  barcode: { type: String, trim: true, index: true },
  cameraChannel: { type: Number, required: true, default: 1 },
  coordinates: {
    x: { type: Number, default: 10 },
    y: { type: Number, default: 10 },
    width: { type: Number, default: 20 },
    height: { type: Number, default: 20 }
  },
  tripwireConfig: {
    type: { type: String, enum: ['BI_DIRECTIONAL', 'OUT_ONLY', 'IN_ONLY'], default: 'BI_DIRECTIONAL' },
    lineInY: { type: Number, default: 40 },
    lineOutY: { type: Number, default: 60 },
    alertOnMissingAtEOD: { type: Boolean, default: true }
  },
  shelfConfig: {
    pickCount: { type: Number, default: 0 },
    capacity: { type: Number, default: 50 },
    lastPickAt: { type: Date }
  },
  gateStatus: {
    status: { type: String, enum: ['INSIDE_SHOP', 'OUTSIDE_SHOP', 'IN_TRANSIT'], default: 'INSIDE_SHOP' },
    lastExitTime: { type: Date },
    lastReturnTime: { type: Date },
    exitCountToday: { type: Number, default: 0 },
    returnCountToday: { type: Number, default: 0 }
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'DISPLACED', 'OUT_OF_SHOP', 'MISSING'], 
    default: 'ACTIVE' 
  },
  totalPicks: { type: Number, default: 0 },
  lastDetectedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

visualPairingBlockSchema.index({ tenantId: 1, blockCode: 1 }, { unique: true });
visualPairingBlockSchema.index({ tenantId: 1, cameraChannel: 1 });

export const VisualPairingBlock = model<IVisualPairingBlock>('VisualPairingBlock', visualPairingBlockSchema);
