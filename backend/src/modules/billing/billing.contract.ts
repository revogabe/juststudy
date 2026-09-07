export type BillingPlan = "free" | "student";

export type BillingSummary = {
  user_id: string;
  plan: BillingPlan;
  status: string;
  credit_allowance: number;
  credits_used: number;
  credits_remaining: number;
  period_ends_at: Date | null;
  is_active: boolean;
};

export type SubscriptionSnapshot = {
  user_id: string;
  plan: BillingPlan;
  status: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  credit_allowance: number;
  credits_used: number;
  period_ends_at: Date | null;
  updated_at: Date;
};

export type PaymentEventCreate = {
  event_id: string;
  event_type: string;
  payload: unknown;
  subscription: SubscriptionSnapshot | null;
};

export type PaymentEventCreateStatus = "processed" | "duplicate" | "ignored";
