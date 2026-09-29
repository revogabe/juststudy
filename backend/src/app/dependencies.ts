import { createDatabase } from "@/infrastructure/database";
import { createFallbackAiAdapter, createOpenAiCompatibleAdapter } from "@/integrations/ai";
import { createSystemOneAdapter } from "@/integrations/decisions";
import { createEmail, createMailpitAdapter, createMemoryAdapter, createResendAdapter, type EmailTransport } from "@/integrations/email";
import { createBetterAuthAdapter } from "@/integrations/identity";
import { createLangfuseObservability } from "@/integrations/observability";
import { createPolarAdapter } from "@/integrations/payments";
import { createLangfusePrompts } from "@/integrations/prompts";
import { createFasterWhisperAdapter } from "@/integrations/transcription";
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
  const transcription = createFasterWhisperAdapter({
    base_url: environment.TRANSCRIPTION_BASE_URL,
    timeout_ms: environment.TRANSCRIPTION_TIMEOUT_MS,
  });
  const localAi = createOpenAiCompatibleAdapter({
    provider_name: environment.AI_PROVIDER_NAME,
    base_url: environment.AI_BASE_URL,
    api_key: environment.AI_API_KEY,
    model: environment.AI_EVALUATION_MODEL,
    input_price_per_million: environment.AI_INPUT_PRICE_PER_MILLION,
    output_price_per_million: environment.AI_OUTPUT_PRICE_PER_MILLION,
    supports_structured_outputs: environment.AI_SUPPORTS_STRUCTURED_OUTPUTS,
    reasoning_effort: environment.AI_REASONING_EFFORT,
    timeout_ms: environment.AI_TIMEOUT_MS,
  });
  const openRouter = {
    provider_name: "openrouter",
    base_url: environment.OPENROUTER_BASE_URL,
    api_key: environment.OPENROUTER_API_KEY,
    supports_structured_outputs: true,
    timeout_ms: environment.OPENROUTER_TIMEOUT_MS,
  };
  const ai = environment.OPENROUTER_API_KEY
    ? createFallbackAiAdapter({
        primary: createOpenAiCompatibleAdapter({
          ...openRouter,
          model: environment.OPENROUTER_EVALUATION_MODEL,
          input_price_per_million: environment.OPENROUTER_INPUT_PRICE_PER_MILLION,
          output_price_per_million: environment.OPENROUTER_OUTPUT_PRICE_PER_MILLION,
          reasoning_effort: environment.OPENROUTER_REASONING_EFFORT,
        }),
        primary_provider: "openrouter",
        fallback: localAi,
        transient_cooldown_ms: environment.AI_FALLBACK_TRANSIENT_COOLDOWN_MS,
        quota_cooldown_ms: environment.AI_FALLBACK_QUOTA_COOLDOWN_MS,
      })
    : localAi;
  const decisions = environment.OPENROUTER_API_KEY
    ? createSystemOneAdapter({
        provider_name: "openrouter",
        base_url: environment.OPENROUTER_BASE_URL,
        api_key: environment.OPENROUTER_API_KEY,
        model: environment.DECISION_MODEL,
        input_price_per_million: environment.DECISION_INPUT_PRICE_PER_MILLION,
        timeout_ms: environment.DECISION_TIMEOUT_MS,
      })
    : null;
  const shadowAi = createOpenAiCompatibleAdapter({
    ...openRouter,
    model: environment.SHADOW_AI_MODEL,
    input_price_per_million: environment.SHADOW_AI_INPUT_PRICE_PER_MILLION,
    output_price_per_million: environment.SHADOW_AI_OUTPUT_PRICE_PER_MILLION,
    reasoning_effort: environment.SHADOW_AI_REASONING_EFFORT,
  });
  const prompts = createLangfusePrompts({
    public_key: environment.LANGFUSE_PUBLIC_KEY,
    secret_key: environment.LANGFUSE_SECRET_KEY,
    base_url: environment.LANGFUSE_BASE_URL,
  });
  const observability = createLangfuseObservability({
    public_key: environment.LANGFUSE_PUBLIC_KEY,
    secret_key: environment.LANGFUSE_SECRET_KEY,
    base_url: environment.LANGFUSE_BASE_URL,
    environment: environment.APP_ENV,
  });

  return {
    database,
    email,
    identity,
    payments,
    transcription,
    ai,
    shadow_ai: shadowAi,
    decisions,
    prompts,
    observability,
  };
}

export type Dependencies = ReturnType<typeof createDependencies>;
