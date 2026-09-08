import { Schema, model, Types, Document } from 'mongoose';

export interface IDeliveryItem {
  bandhi: Types.ObjectId; // Ref MilkBandhi
  bandhiNo: number;
  customerName: string;
  customer?: Types.ObjectId; // Ref Customer
  milkType: 'Buffalo' | 'Cow' | 'Mixed';
  standardQuantity: number; // Scheduled daily qty
  deliveredQuantity: number; // Actual delivered qty (0 if skipped)
  rate: number;
  amount: number;
  status: 'DELIVERED' | 'SKIPPED' | 'EXTRA'; // SKIPPED means 'नागा / छुट्टी'
  notes?: string;
}

export interface IBandhiDeliveryLog extends Document {
  tenantId: Types.ObjectId;
  date: Date; // Midnight normalized date
  shift: 'Morning' | 'Evening';
  deliveries: IDeliveryItem[];
  totalMilkDelivered: number; // Total Litres delivered
  totalAmount: number; // Total billed amount for the shift
  deliveredCount: number;
  skippedCount: number;
  isConfirmed: boolean;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryItemSchema = new Schema<IDeliveryItem>(
  {
    bandhi: { type: Schema.Types.ObjectId, ref: 'MilkBandhi', required: true },
    bandhiNo: { type: Number, required: true },
    customerName: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    milkType: { type: String, enum: ['Buffalo', 'Cow', 'Mixed'], default: 'Buffalo' },
    standardQuantity: { type: Number, required: true },
    deliveredQuantity: { type: Number, required: true, default: 0 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['DELIVERED', 'SKIPPED', 'EXTRA'],
      default: 'DELIVERED',
    },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const bandhiDeliveryLogSchema = new Schema<IBandhiDeliveryLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, index: true },
    shift: { type: String, enum: ['Morning', 'Evening'], required: true },
    deliveries: [deliveryItemSchema],
    totalMilkDelivered: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    deliveredCount: { type: Number, required: true, default: 0 },
    skippedCount: { type: Number, required: true, default: 0 },
    isConfirmed: { type: Boolean, default: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bandhiDeliveryLogSchema.index({ tenantId: 1, date: 1, shift: 1 }, { unique: true });

export const BandhiDeliveryLog = model<IBandhiDeliveryLog>('BandhiDeliveryLog', bandhiDeliveryLogSchema);
