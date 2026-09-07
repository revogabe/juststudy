import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "@/modules/authentication/authentication.model";
import type { BillingPlan } from "./billing.contract";

export const subscriptions = pgTable("subscriptions", {
  user_id: text()
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict" }),
  plan: text().$type<BillingPlan>().notNull(),
  status: text().notNull(),
  provider_customer_id: text().notNull(),
  provider_subscription_id: text().notNull(),
  credit_allowance: integer().default(0).notNull(),
  credits_used: integer().default(0).notNull(),
  period_ends_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const payment_events = pgTable("payment_events", {
  event_id: text().primaryKey(),
  event_type: text().notNull(),
  payload: jsonb().notNull(),
  received_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  processed_at: timestamp({ withTimezone: true }),
});

export const subscriptions_relations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionCreate = typeof subscriptions.$inferInsert;
