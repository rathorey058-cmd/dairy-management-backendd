import { Types } from 'mongoose';
export type CameraLocationType = 'COUNTER_OCR' | 'GALLA_SECURITY' | 'SHELF_INVENTORY' | 'GATE_ENTRY' | 'CATTLE_SHED';
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
export declare const CameraDevice: import("mongoose").Model<ICameraDevice, {}, {}, {}, import("mongoose").Document<unknown, {}, ICameraDevice, {}, import("mongoose").DefaultSchemaOptions> & ICameraDevice & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ICameraDevice>;
