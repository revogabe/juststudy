import type { IdentityUser } from "@/integrations/identity";
import {
  InvalidPaymentEventError,
  type PaymentEvent,
  type Payments,
} from "@/integrations/payments";
import type { BillingPlan, BillingSummary, SubscriptionSnapshot } from "./billing.contract";
import { billingError } from "./billing.error";
import type { BillingStore } from "./billing.store";

type BillingServiceInput = {
  store: BillingStore;
  payments: Payments;
  product_id: string;
  free_credits: number;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function freeSummary(userId: string, freeCredits: number): BillingSummary {
  return {
    user_id: userId,
    plan: "free",
    status: "active",
    credit_allowance: freeCredits,
    credits_used: 0,
    credits_remaining: freeCredits,
    period_ends_at: null,
    is_active: true,
  };
}

function subscriptionSummary(subscription: SubscriptionSnapshot): BillingSummary {
  return {
    user_id: subscription.user_id,
    plan: subscription.plan,
    status: subscription.status,
    credit_allowance: subscription.credit_allowance,
    credits_used: subscription.credits_used,
    credits_remaining: Math.max(0, subscription.credit_allowance - subscription.credits_used),
    period_ends_at: subscription.period_ends_at,
    is_active: ACTIVE_STATUSES.has(subscription.status),
  };
}

function toSubscription(event: PaymentEvent, productId: string): SubscriptionSnapshot | null {
  if (event.event_type !== "customer.state_changed") return null;

  if (!event.user_id || !event.customer_id) throw billingError.unlinkedCustomer();

  const paidSubscription = event.subscriptions.find(
    (subscription) => subscription.product_id === productId,
  );
  const usage = event.meters.reduce(
    (total, meter) => ({
      credited_units: total.credited_units + meter.credited_units,
      consumed_units: total.consumed_units + meter.consumed_units,
    }),
    { credited_units: 0, consumed_units: 0 },
  );
  let plan: BillingPlan = "free";

  if (paidSubscription) plan = "student";

  return {
    user_id: event.user_id,
    plan,
    status: paidSubscription?.status ?? "canceled",
    provider_customer_id: event.customer_id,
    provider_subscription_id: paidSubscription?.subscription_id ?? "",
    credit_allowance: usage.credited_units,
    credits_used: usage.consumed_units,
    period_ends_at: paidSubscription?.period_ends_at ?? null,
    updated_at: new Date(),
  };
}

function paymentCustomer(user: IdentityUser) {
  return {
    user_id: user.id,
    email: user.email,
  };
}

export function createBillingService(input: BillingServiceInput) {
  return {
    summary: {
      async get(userId: string): Promise<BillingSummary> {
        const subscription = await input.store.subscription.get(userId);

        if (!subscription) return freeSummary(userId, input.free_credits);

        return subscriptionSummary(subscription);
      },
    },
    checkout: {
      async create(user: IdentityUser) {
        try {
          return await input.payments.checkout.create(paymentCustomer(user));
        } catch {
          throw billingError.providerUnavailable();
        }
      },
    },
    portal: {
      async create(user: IdentityUser) {
        try {
          return await input.payments.portal.create(paymentCustomer(user));
        } catch {
          throw billingError.providerUnavailable();
        }
      },
    },
    paymentEvent: {
      async create(eventInput: { body: string; headers: Headers }) {
        try {
          const event = await input.payments.event.create(eventInput);

          return input.store.paymentEvent.create({
            event_id: event.event_id,
            event_type: event.event_type,
            payload: event.payload,
            subscription: toSubscription(event, input.product_id),
          });
        } catch (error) {
          if (error instanceof InvalidPaymentEventError) throw billingError.invalidEvent();

          throw error;
        }
      },
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
