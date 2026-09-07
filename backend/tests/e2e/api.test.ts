import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Webhook } from "standardwebhooks";
import { createApplication } from "@/app/app";
import { createEnvironment } from "@/app/env";
import { createDatabase } from "@/infrastructure/database";
import { createEmail, createMemoryAdapter } from "@/integrations/email";
import { createBetterAuthAdapter } from "@/integrations/identity";
import { createPolarAdapter } from "@/integrations/payments";
import { authenticationSchema } from "@/modules/authentication";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@/modules/authentication/authentication.model";
import { payment_events, subscriptions } from "@/modules/billing/billing.model";

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";

function databaseSuite() {
  if (runDatabaseTests) {
    return describe;
  }

  return describe.skip;
}

const databaseDescribe = databaseSuite();
const CREATED_AT = "2026-09-01T00:00:00.000Z";
const PRODUCT_ID = "product-student";
const WEBHOOK_SECRET = "juststudy-test-webhook-secret";

const environment = createEnvironment({
  APP_ENV: "test",
  APP_BASE_URL: "http://localhost:3000",
  APP_WEB_URL: "http://localhost:3001",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgres://juststudy:juststudy@127.0.0.1:5432/juststudy_test",
  AUTH_SECRET: "test-secret-with-at-least-32-characters",
  EMAIL_PROVIDER: "memory",
  POLAR_WEBHOOK_SECRET: WEBHOOK_SECRET,
  POLAR_PRODUCT_ID: PRODUCT_ID,
});
const database = createDatabase(environment.DATABASE_URL);
const email = createEmail(createMemoryAdapter());
const identity = createBetterAuthAdapter({
  base_url: environment.APP_BASE_URL,
  secret: environment.AUTH_SECRET,
  trusted_origins: [environment.APP_WEB_URL],
  google_client_id: "test-google-client",
  google_client_secret: "test-google-secret",
  database: database.client,
  schema: authenticationSchema,
  email,
});
const payments = createPolarAdapter({
  access_token: "",
  server: "sandbox",
  webhook_secret: WEBHOOK_SECRET,
  product_id: PRODUCT_ID,
  success_url: "http://localhost:3001/billing/success",
  return_url: "http://localhost:3001/settings/billing",
});
const application = createApplication({
  environment,
  dependencies: { database, email, identity, payments },
});

function request(path: string, init?: RequestInit): Promise<Response> {
  return application.handle(new Request(`http://localhost:3000${path}`, init));
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];

  if (!cookie) {
    throw new Error("Authentication response did not set a session cookie.");
  }

  return cookie;
}

function customerState(userId: string) {
  return {
    type: "customer.state_changed",
    timestamp: CREATED_AT,
    data: {
      id: `customer-${userId}`,
      created_at: CREATED_AT,
      modified_at: null,
      metadata: {},
      external_id: userId,
      email: "learner@juststudy.test",
      email_verified: true,
      type: "individual",
      name: "Learner",
      billing_address: null,
      tax_id: null,
      organization_id: "organization-1",
      deleted_at: null,
      avatar_url: "https://example.test/avatar.png",
      active_subscriptions: [
        {
          id: `subscription-${userId}`,
          created_at: CREATED_AT,
          modified_at: null,
          metadata: {},
          status: "active",
          amount: 1990,
          currency: "usd",
          recurring_interval: "month",
          current_period_start: CREATED_AT,
          current_period_end: "2026-10-01T00:00:00.000Z",
          cancel_at_period_end: false,
          canceled_at: null,
          started_at: CREATED_AT,
          ends_at: null,
          product_id: PRODUCT_ID,
          discount_id: null,
          trial_start: null,
          trial_end: null,
          meters: [],
        },
      ],
      granted_benefits: [],
      active_meters: [
        {
          id: `meter-${userId}`,
          created_at: CREATED_AT,
          modified_at: null,
          meter_id: "meter-ai-credits",
          consumed_units: 125,
          credited_units: 1000,
          balance: 875,
        },
      ],
    },
  };
}

function signedWebhook(payload: unknown): RequestInit {
  const body = JSON.stringify(payload);
  const messageId = Bun.randomUUIDv7();
  const timestamp = new Date();
  const webhook = new Webhook(Buffer.from(WEBHOOK_SECRET, "utf-8").toString("base64"));

  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": messageId,
      "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "webhook-signature": webhook.sign(messageId, timestamp, body),
    },
    body,
  };
}

async function cleanDatabase(): Promise<void> {
  await database.client.delete(payment_events);
  await database.client.delete(subscriptions);
  await database.client.delete(sessions);
  await database.client.delete(accounts);
  await database.client.delete(verifications);
  await database.client.delete(users);
}

databaseDescribe("JustStudy HTTP API", () => {
  beforeAll(cleanDatabase);

  afterAll(async () => {
    await cleanDatabase();
    await database.connection.close();
  });

  it("serves health and OpenAPI", async () => {
    const health = await request("/health");
    const specification = await request("/openapi.json");

    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(specification.status).toBe(200);
  });

  it("creates an anonymous session and protects identified operations", async () => {
    const authentication = await request("/v1/auth/anonymous", {
      method: "POST",
    });
    const cookie = sessionCookie(authentication);
    const session = await request("/v1/auth/session", {
      headers: { cookie },
    });
    const checkout = await request("/v1/billing/checkout", {
      method: "POST",
      headers: { cookie },
    });

    expect(authentication.status).toBe(200);
    expect(await session.json()).toMatchObject({
      user: { is_anonymous: true },
    });
    expect(checkout.status).toBe(403);
  });

  it("mirrors a signed payment event idempotently", async () => {
    const authentication = await request("/v1/auth/anonymous", {
      method: "POST",
    });
    const cookie = sessionCookie(authentication);
    const authenticationBody = (await authentication.json()) as {
      user: { id: string };
    };
    const webhook = signedWebhook(customerState(authenticationBody.user.id));
    const firstDelivery = await request("/v1/billing/webhook", webhook);
    const secondDelivery = await request("/v1/billing/webhook", webhook);
    const summary = await request("/v1/billing/summary", {
      headers: { cookie },
    });

    expect(await firstDelivery.json()).toEqual({ status: "processed" });
    expect(await secondDelivery.json()).toEqual({ status: "duplicate" });
    expect(await summary.json()).toMatchObject({
      plan: "student",
      credit_allowance: 1000,
      credits_used: 125,
      credits_remaining: 875,
      is_active: true,
    });
  });
});
