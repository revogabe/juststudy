import { describe, expect, it } from "bun:test";
import type { IdentityUser } from "@/integrations/identity";
import type { Payments } from "@/integrations/payments";
import { createBillingService } from "@/modules/billing/billing.service";
import type { BillingStore } from "@/modules/billing/billing.store";

const identifiedUser: IdentityUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@juststudy.test",
  email_verified: true,
  image: null,
  is_anonymous: false,
};

function createStore(): BillingStore {
  return {
    subscription: {
      async get() {
        return null;
      },
    },
    paymentEvent: {
      async create() {
        return "processed";
      },
    },
  };
}

function createPayments(): Payments {
  return {
    checkout: {
      async create(customer) {
        return { checkout_url: `https://checkout.test/${customer.user_id}` };
      },
    },
    portal: {
      async create(customer) {
        return { portal_url: `https://portal.test/${customer.user_id}` };
      },
    },
    event: {
      async create() {
        return {
          event_id: "event-1",
          event_type: "customer.state_changed",
          customer_id: "customer-1",
          user_id: "user-1",
          subscriptions: [
            {
              subscription_id: "subscription-1",
              product_id: "student-product",
              status: "active",
              period_ends_at: new Date("2026-10-01T00:00:00.000Z"),
            },
          ],
          meters: [{ credited_units: 1000, consumed_units: 125 }],
          payload: {},
        };
      },
    },
    usage: {
      async create() {},
    },
  };
}

describe("billing service", () => {
  it("returns a free summary when there is no subscription mirror", async () => {
    const service = createBillingService({
      store: createStore(),
      payments: createPayments(),
      product_id: "student-product",
      free_credits: 3,
    });

    await expect(service.summary.get("user-1")).resolves.toMatchObject({
      plan: "free",
      credits_remaining: 3,
      is_active: true,
    });
  });

  it("passes only neutral customer data to the payment adapter", async () => {
    const service = createBillingService({
      store: createStore(),
      payments: createPayments(),
      product_id: "student-product",
      free_credits: 3,
    });

    await expect(service.checkout.create(identifiedUser)).resolves.toEqual({
      checkout_url: "https://checkout.test/user-1",
    });
  });

  it("converts a provider event into one atomic store operation", async () => {
    const received = { user_id: null as string | null };
    const store = createStore();
    store.paymentEvent.create = async (event) => {
      received.user_id = event.subscription?.user_id ?? null;
      return "processed";
    };
    const service = createBillingService({
      store,
      payments: createPayments(),
      product_id: "student-product",
      free_credits: 3,
    });

    await expect(service.paymentEvent.create({ body: "{}", headers: new Headers() })).resolves.toBe("processed");
    expect(received.user_id).toBe("user-1");
  });

  it("provides an isolated student entitlement without calling Polar in E2E test mode", async () => {
    let usageCalls = 0;
    const payments = createPayments();
    payments.usage.create = async () => {
      usageCalls += 1;
    };
    const service = createBillingService({
      store: createStore(),
      payments,
      product_id: "student-product",
      free_credits: 3,
      e2e_test_mode: true,
    });

    await expect(service.entitlement.get("user-1")).resolves.toEqual({ active_student: true });
    await expect(service.summary.get("user-1")).resolves.toMatchObject({
      plan: "student",
      status: "active",
      is_active: true,
    });
    await service.usage.create({
      external_id: "evaluation-1",
      user_id: "user-1",
      total_tokens: 10,
      input_tokens: 7,
      output_tokens: 3,
      model: "test-model",
    });
    expect(usageCalls).toBe(0);
  });
});
