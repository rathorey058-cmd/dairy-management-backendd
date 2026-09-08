import { Schema, model, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId; // Ref Product
  quantity: number;
  rate: number;
  amount: number;
}

export interface IOrder {
  tenantId: Types.ObjectId;
  customer?: Types.ObjectId; // Ref Customer (null for cash counter sales)
  customerName?: string; // Cache customer name or for counter guest
  items: IOrderItem[];
  totalAmount: number;
  orderDate: Date;
  status: 'Pending' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Failed' | 'Cancelled';
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Credit';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  deliveryBoy?: Types.ObjectId; // Ref User
  deliveryAddress?: string;
  deliveryProofUrl?: string;
  failedReason?: string;
  whatsappMessageId?: string; // to track WhatsApp source
  source: 'Counter' | 'WhatsApp' | 'Web' | 'Other';
  notes?: string;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: { type: String },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, required: true, default: Date.now },
  status: { 
    type: String, 
    enum: ['Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Failed', 'Cancelled'], 
    default: 'Pending',
    index: true
  },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Credit'], required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
  deliveryBoy: { type: Schema.Types.ObjectId, ref: 'User' },
  deliveryAddress: { type: String },
  deliveryProofUrl: { type: String },
  failedReason: { type: String },
  whatsappMessageId: { type: String },
  source: { type: String, enum: ['Counter', 'WhatsApp', 'Web', 'Other'], default: 'Counter' },
  notes: { type: String }
}, { timestamps: true });

orderSchema.index({ tenantId: 1, orderDate: -1 });

export const Order = model<IOrder>('Order', orderSchema);
