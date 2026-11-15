import { Types } from 'mongoose';
export interface IFarmer {
    tenantId: Types.ObjectId;
    farmerId: string;
    name: string;
    mobile: string;
    village: string;
    address?: string;
    bankAccount?: string;
    ifsc?: string;
    upi?: string;
    joiningDate: Date;
    status: 'Active' | 'Inactive';
    openingBalance: number;
    openingAdvance: number;
    fatRate?: number;
    tokenNumber?: string;
    tokenBarcode?: string;
    photoUrl?: string;
    notes?: string;
    dpdpConsentGiven?: boolean;
    dpdpConsentDate?: Date;
    dpdpConsentChannel?: string;
}
export declare const Farmer: import("mongoose").Model<IFarmer, {}, {}, {}, import("mongoose").Document<unknown, {}, IFarmer, {}, import("mongoose").DefaultSchemaOptions> & IFarmer & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IFarmer>;
