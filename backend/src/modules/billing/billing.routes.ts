import { Elysia } from "elysia";
import { type AuthenticationService, createAuthenticationMacro } from "@/modules/authentication";
import {
  billingSummarySchema,
  checkoutSchema,
  paymentEventSchema,
  portalSchema,
} from "./billing.schema";
import type { BillingService } from "./billing.service";

export function createBillingRoutes(
  service: BillingService,
  authentication: AuthenticationService,
) {
  return new Elysia({ name: "billing.routes", prefix: "/v1/billing" })
    .use(createAuthenticationMacro(authentication))
    .get(
      "/summary",
      {
        auth: "session",
        response: billingSummarySchema,
        detail: { tags: ["Billing"], summary: "Get the billing summary" },
      },
      async ({ user }) => {
        const summary = await service.summary.get(user.id);

        return {
          ...summary,
          period_ends_at: summary.period_ends_at?.toISOString() ?? null,
        };
      },
    )
    .post(
      "/checkout",
      {
        auth: "identified",
        response: checkoutSchema,
        detail: { tags: ["Billing"], summary: "Create a checkout" },
      },
      async ({ user }) => {
        return service.checkout.create(user);
      },
    )
    .post(
      "/portal",
      {
        auth: "identified",
        response: portalSchema,
        detail: { tags: ["Billing"], summary: "Create a customer portal session" },
      },
      async ({ user }) => {
        return service.portal.create(user);
      },
    )
    .post(
      "/webhook",
      {
        parse: "none",
        response: paymentEventSchema,
        detail: { tags: ["Billing"], summary: "Receive a Polar webhook" },
      },
      async ({ request }) => {
        const status = await service.paymentEvent.create({
          body: await request.text(),
          headers: request.headers,
        });

        return { status };
      },
    );
}
