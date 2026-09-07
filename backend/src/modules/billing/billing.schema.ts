import { t } from "elysia";

export const billingSummarySchema = t.Object({
  user_id: t.String(),
  plan: t.Union([t.Literal("free"), t.Literal("student")]),
  status: t.String(),
  credit_allowance: t.Integer(),
  credits_used: t.Integer(),
  credits_remaining: t.Integer(),
  period_ends_at: t.Nullable(t.String({ format: "date-time" })),
  is_active: t.Boolean(),
});

export const checkoutSchema = t.Object({
  checkout_url: t.String({ format: "uri" }),
});

export const portalSchema = t.Object({
  portal_url: t.String({ format: "uri" }),
});

export const paymentEventSchema = t.Object({
  status: t.Union([t.Literal("processed"), t.Literal("duplicate"), t.Literal("ignored")]),
});
