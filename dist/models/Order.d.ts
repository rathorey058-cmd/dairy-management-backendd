import { Types } from 'mongoose';
export interface IOrderItem {
    product: Types.ObjectId;
    quantity: number;
    rate: number;
    amount: number;
}
export interface IOrder {
    tenantId: Types.ObjectId;
    customer?: Types.ObjectId;
    customerName?: string;
    items: IOrderItem[];
    totalAmount: number;
    orderDate: Date;
    status: 'Pending' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Failed' | 'Cancelled';
    paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Credit';
    paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
    deliveryBoy?: Types.ObjectId;
    deliveryAddress?: string;
    deliveryProofUrl?: string;
    failedReason?: string;
    whatsappMessageId?: string;
    source: 'Counter' | 'WhatsApp' | 'Web' | 'Other';
    notes?: string;
}
export declare const Order: import("mongoose").Model<IOrder, {}, {}, {}, import("mongoose").Document<unknown, {}, IOrder, {}, import("mongoose").DefaultSchemaOptions> & IOrder & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, IOrder>;
