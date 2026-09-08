import { Schema, model, Types } from 'mongoose';

export interface IAuditLog {
  tenantId: Types.ObjectId;
  user: Types.ObjectId; // Ref User
  action: string;
  entityType?: string; // e.g. 'Farmer', 'MilkCollection', 'Payment'
  entityId?: Types.ObjectId;
  oldValue?: Schema.Types.Mixed;
  newValue?: Schema.Types.Mixed;
  ipAddress?: string;
  deviceInfo?: string;
}

const auditLogSchema = new Schema<IAuditLog>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: Schema.Types.ObjectId },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  deviceInfo: { type: String }
}, { timestamps: true });

auditLogSchema.index({ tenantId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
