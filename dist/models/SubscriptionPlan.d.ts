export interface ISubscriptionPlan {
    name: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers: number;
    maxWhatsAppOrders: number;
    features: string[];
    storageLimitGb: number;
}
export declare const SubscriptionPlan: import("mongoose").Model<ISubscriptionPlan, {}, {}, {}, import("mongoose").Document<unknown, {}, ISubscriptionPlan, {}, import("mongoose").DefaultSchemaOptions> & ISubscriptionPlan & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ISubscriptionPlan>;
