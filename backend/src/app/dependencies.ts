import { createDatabase } from "@/infrastructure/database";
import { type Ai, createFallbackAiAdapter, createOpenAiAdapter, createOpenAiCompatibleAdapter } from "@/integrations/ai";
import { createSystemOneAdapter } from "@/integrations/decisions";
import { createEmail, createMailpitAdapter, createMemoryAdapter, createResendAdapter, type EmailTransport } from "@/integrations/email";
import { createBetterAuthAdapter } from "@/integrations/identity";
import { createLangfuseObservability } from "@/integrations/observability";
import { createPolarAdapter } from "@/integrations/payments";
import { createLangfusePrompts } from "@/integrations/prompts";
import { createFasterWhisperAdapter } from "@/integrations/transcription";
import { authenticationSchema } from "@/modules/authentication";
import type { Environment } from "./env";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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

function createPrimaryAi(environment: Environment): Ai | null {
  if (environment.APP_ENV === "production") {
    return createOpenAiAdapter({
      api_key: environment.OPENAI_API_KEY,
      base_url: environment.OPENAI_BASE_URL,
      model: environment.OPENAI_EVALUATION_MODEL,
      input_price_per_million: environment.OPENAI_INPUT_PRICE_PER_MILLION,
      output_price_per_million: environment.OPENAI_OUTPUT_PRICE_PER_MILLION,
      reasoning_effort: environment.OPENAI_REASONING_EFFORT,
      timeout_ms: environment.OPENAI_TIMEOUT_MS,
    });
  }

  if (!environment.OPENROUTER_API_KEY) return null;

  return createOpenAiCompatibleAdapter({
    provider_name: "openrouter",
    base_url: OPENROUTER_BASE_URL,
    api_key: environment.OPENROUTER_API_KEY,
    model: `openai/${environment.OPENAI_EVALUATION_MODEL}`,
    input_price_per_million: environment.OPENAI_INPUT_PRICE_PER_MILLION,
    output_price_per_million: environment.OPENAI_OUTPUT_PRICE_PER_MILLION,
    supports_structured_outputs: true,
    reasoning_effort: environment.OPENAI_REASONING_EFFORT,
    timeout_ms: environment.OPENAI_TIMEOUT_MS,
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
  const primaryAi = createPrimaryAi(environment);
  const ai = primaryAi
    ? createFallbackAiAdapter({
        primary: primaryAi,
        fallback: localAi,
        transient_cooldown_ms: environment.AI_FALLBACK_TRANSIENT_COOLDOWN_MS,
        quota_cooldown_ms: environment.AI_FALLBACK_QUOTA_COOLDOWN_MS,
      })
    : localAi;
  const decisionApiKey = environment.DECISION_API_KEY || environment.OPENROUTER_API_KEY;
  const decisions = decisionApiKey
    ? createSystemOneAdapter({
        provider_name: environment.DECISION_PROVIDER_NAME,
        base_url: environment.DECISION_BASE_URL,
        api_key: decisionApiKey,
        model: environment.DECISION_MODEL,
        input_price_per_million: environment.DECISION_INPUT_PRICE_PER_MILLION,
        timeout_ms: environment.DECISION_TIMEOUT_MS,
      })
    : null;
  const shadowAi = createOpenAiCompatibleAdapter({
    provider_name: environment.SHADOW_AI_PROVIDER_NAME,
    base_url: environment.SHADOW_AI_BASE_URL,
    api_key: environment.SHADOW_AI_API_KEY || environment.OPENROUTER_API_KEY,
    model: environment.SHADOW_AI_MODEL,
    input_price_per_million: environment.SHADOW_AI_INPUT_PRICE_PER_MILLION,
    output_price_per_million: environment.SHADOW_AI_OUTPUT_PRICE_PER_MILLION,
    supports_structured_outputs: true,
    reasoning_effort: environment.SHADOW_AI_REASONING_EFFORT,
    timeout_ms: environment.OPENAI_TIMEOUT_MS,
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
