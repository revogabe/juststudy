import { Polar } from "@polar-sh/sdk";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import {
  InvalidPaymentEventError,
  type PaymentEvent,
  type PaymentMeter,
  type PaymentSubscription,
  type Payments,
} from "../payments.contract";

type PolarAdapterInput = {
  access_token: string;
  server: "sandbox" | "production";
  webhook_secret: string;
  product_id: string;
  success_url: string;
  return_url: string;
};

function eventId(headers: Headers): string {
  const id = headers.get("webhook-id");

  if (!id) throw new InvalidPaymentEventError();

  return id;
}

function toHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function toPaymentSubscription(subscription: {
  id: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date | null;
}): PaymentSubscription {
  return {
    subscription_id: subscription.id,
    product_id: subscription.productId,
    status: subscription.status,
    period_ends_at: subscription.currentPeriodEnd,
  };
}

function toPaymentMeter(meter: { creditedUnits: number; consumedUnits: number }): PaymentMeter {
  return {
    credited_units: meter.creditedUnits,
    consumed_units: meter.consumedUnits,
  };
}

function toPaymentEvent(body: string, headers: Headers, secret: string): PaymentEvent {
  try {
    const event = validateEvent(body, toHeaders(headers), secret);

    if (event.type !== "customer.state_changed") {
      return {
        event_id: eventId(headers),
        event_type: event.type,
        customer_id: null,
        user_id: null,
        subscriptions: [],
        meters: [],
        payload: JSON.parse(body) as unknown,
      };
    }

    return {
      event_id: eventId(headers),
      event_type: event.type,
      customer_id: event.data.id,
      user_id: event.data.externalId ?? null,
      subscriptions: event.data.activeSubscriptions.map(toPaymentSubscription),
      meters: event.data.activeMeters.map(toPaymentMeter),
      payload: JSON.parse(body) as unknown,
    };
  } catch (error) {
    if (error instanceof InvalidPaymentEventError) throw error;

    throw new InvalidPaymentEventError(error);
  }
}

export function createPolarAdapter(input: PolarAdapterInput): Payments {
  const client = new Polar({
    accessToken: input.access_token,
    server: input.server,
  });

  return {
    checkout: {
      async create(customer) {
        const checkout = await client.checkouts.create({
          products: [input.product_id],
          externalCustomerId: customer.user_id,
          customerEmail: customer.email,
          successUrl: input.success_url,
        });

        return { checkout_url: checkout.url };
      },
    },
    portal: {
      async create(customer) {
        const session = await client.customerSessions.create({
          externalCustomerId: customer.user_id,
          returnUrl: input.return_url,
        });

        return { portal_url: session.customerPortalUrl };
      },
    },
    event: {
      async create(event) {
        return toPaymentEvent(event.body, event.headers, input.webhook_secret);
      },
    },
  };
}
