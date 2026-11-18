import { Types } from 'mongoose';
export type PairingBlockCategory = 'GALLA' | 'REUSABLE_CAN' | 'SHELF' | 'GATE_TRIPWIRE' | 'MACHINERY' | 'CUSTOM';
export interface IVisualPairingBlock {
    tenantId: Types.ObjectId;
    blockCode: string;
    name: string;
    category: PairingBlockCategory;
    color: string;
    barcode?: string;
    cameraChannel: number;
    coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    tripwireConfig?: {
        type: 'BI_DIRECTIONAL' | 'OUT_ONLY' | 'IN_ONLY';
        lineInY: number;
        lineOutY: number;
        alertOnMissingAtEOD: boolean;
    };
    shelfConfig?: {
        pickCount: number;
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
export declare const VisualPairingBlock: import("mongoose").Model<IVisualPairingBlock, {}, {}, {}, import("mongoose").Document<unknown, {}, IVisualPairingBlock, {}, import("mongoose").DefaultSchemaOptions> & IVisualPairingBlock & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IVisualPairingBlock>;
