import { Schema, model } from 'mongoose';

export interface ISubscriptionPlan {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxWhatsAppOrders: number;
  features: string[];
  storageLimitGb: number;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: { type: String, required: true, unique: true },
  priceMonthly: { type: Number, required: true },
  priceYearly: { type: Number, required: true },
  maxUsers: { type: Number, required: true },
  maxWhatsAppOrders: { type: Number, required: true },
  features: [{ type: String }],
  storageLimitGb: { type: Number, required: true, default: 5 }
}, { timestamps: true });

export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
