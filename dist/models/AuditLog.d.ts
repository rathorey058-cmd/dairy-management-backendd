import { Schema, Types } from 'mongoose';
export interface IAuditLog {
    tenantId: Types.ObjectId;
    user: Types.ObjectId;
    action: string;
    entityType?: string;
    entityId?: Types.ObjectId;
    oldValue?: Schema.Types.Mixed;
    newValue?: Schema.Types.Mixed;
    ipAddress?: string;
    deviceInfo?: string;
}
export declare const AuditLog: import("mongoose").Model<IAuditLog, {}, {}, {}, import("mongoose").Document<unknown, {}, IAuditLog, {}, import("mongoose").DefaultSchemaOptions> & IAuditLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IAuditLog>;
