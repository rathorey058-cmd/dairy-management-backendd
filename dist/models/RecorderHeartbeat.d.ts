import { Types, Document } from 'mongoose';
/**
 * One document per minute in which the 24/7 AI recorder was alive.
 * Lets reports say honestly "recorder was OFF" instead of showing a fake 0.
 */
export interface IRecorderHeartbeat extends Document {
    tenantId: Types.ObjectId;
    minute: number;
    at: Date;
}
export declare const RecorderHeartbeat: import("mongoose").Model<IRecorderHeartbeat, {}, {}, {}, Document<unknown, {}, IRecorderHeartbeat, {}, import("mongoose").DefaultSchemaOptions> & IRecorderHeartbeat & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRecorderHeartbeat>;
