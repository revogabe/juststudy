import { createDatabase } from "@/infrastructure/database";
import {
  createEmail,
  createMailpitAdapter,
  createMemoryAdapter,
  createResendAdapter,
  type EmailTransport,
} from "@/integrations/email";
import { createBetterAuthAdapter } from "@/integrations/identity";
import { createPolarAdapter } from "@/integrations/payments";
import { authenticationSchema } from "@/modules/authentication";
import type { Environment } from "./env";

function createEmailTransport(environment: Environment): EmailTransport {
  if (environment.EMAIL_PROVIDER === "memory") return createMemoryAdapter();

  if (environment.EMAIL_PROVIDER === "resend") {
    return createResendAdapter({
      api_key: environment.RESEND_API_KEY,
      sender: environment.EMAIL_FROM,
    });
  }

  return createMailpitAdapter({
    base_url: environment.MAILPIT_URL,
    sender: environment.EMAIL_FROM,
  });
}

export function createDependencies(environment: Environment) {
  const database = createDatabase(environment.DATABASE_URL);
  const email = createEmail(createEmailTransport(environment));
  const identity = createBetterAuthAdapter({
    base_url: environment.APP_BASE_URL,
    secret: environment.AUTH_SECRET,
    trusted_origins: [environment.APP_WEB_URL],
    google_client_id: environment.GOOGLE_CLIENT_ID,
    google_client_secret: environment.GOOGLE_CLIENT_SECRET,
    database: database.client,
    schema: authenticationSchema,
    email,
  });
  const payments = createPolarAdapter({
    access_token: environment.POLAR_ACCESS_TOKEN,
    server: environment.POLAR_SERVER,
    webhook_secret: environment.POLAR_WEBHOOK_SECRET,
    product_id: environment.POLAR_PRODUCT_ID,
    success_url: environment.POLAR_SUCCESS_URL,
    return_url: environment.POLAR_RETURN_URL,
  });

  return {
    database,
    email,
    identity,
    payments,
  };
}

export type Dependencies = ReturnType<typeof createDependencies>;
