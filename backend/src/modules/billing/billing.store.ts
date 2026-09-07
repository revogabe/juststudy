import { eq } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import type {
  PaymentEventCreate,
  PaymentEventCreateStatus,
  SubscriptionSnapshot,
} from "./billing.contract";
import { payment_events, subscriptions } from "./billing.model";

export function createBillingStore(database: DatabaseClient) {
  return {
    subscription: {
      async get(userId: string): Promise<SubscriptionSnapshot | null> {
        const [subscription] = await database
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.user_id, userId));

        if (!subscription) return null;

        return subscription;
      },
    },
    paymentEvent: {
      async create(input: PaymentEventCreate): Promise<PaymentEventCreateStatus> {
        return database.transaction(async (transaction) => {
          const [event] = await transaction
            .insert(payment_events)
            .values({
              event_id: input.event_id,
              event_type: input.event_type,
              payload: input.payload,
            })
            .onConflictDoNothing({ target: payment_events.event_id })
            .returning({ event_id: payment_events.event_id });

          if (!event) return "duplicate";

          if (!input.subscription) return "ignored";

          await transaction.insert(subscriptions).values(input.subscription).onConflictDoUpdate({
            target: subscriptions.user_id,
            set: input.subscription,
          });

          await transaction
            .update(payment_events)
            .set({ processed_at: new Date() })
            .where(eq(payment_events.event_id, input.event_id));

          return "processed";
        });
      },
    },
  };
}

export type BillingStore = ReturnType<typeof createBillingStore>;
