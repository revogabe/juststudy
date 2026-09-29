import { z } from "zod";

const environmentSchema = z
  .object({
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_HOST: z.string().min(1).default("127.0.0.1"),
    APP_PORT: z.coerce.number().int().positive().default(3000),
    APP_BASE_URL: z.url().default("http://127.0.0.1:3000"),
    APP_WEB_URL: z.url().default("http://localhost:3001"),
    E2E_TEST_MODE: z.stringbool().default(false),

    DATABASE_URL: z.string().min(1),

    KNOWLEDGE_CATALOG_TOKEN: z.string().min(32),
    KNOWLEDGE_ASSESSMENT_GENERATION: z.stringbool().default(false),

    AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),

    EMAIL_PROVIDER: z.enum(["mailpit", "memory", "resend"]).default("mailpit"),
    EMAIL_FROM: z.email().default("no-reply@juststudy.test"),
    RESEND_API_KEY: z.string().default(""),
    MAILPIT_URL: z.url().default("http://127.0.0.1:8025"),

    TRANSCRIPTION_BASE_URL: z.url().default("http://127.0.0.1:8001"),
    TRANSCRIPTION_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),

    AI_PROVIDER_NAME: z.string().min(1).default("ollama"),
    AI_BASE_URL: z.url().default("http://127.0.0.1:11434/v1"),
    AI_API_KEY: z.string().default("ollama"),
    AI_EVALUATION_MODEL: z.string().min(1).default("qwen3.5:9b"),
    AI_INPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0),
    AI_OUTPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0),
    AI_SUPPORTS_STRUCTURED_OUTPUTS: z.stringbool().default(true),
    AI_REASONING_EFFORT: z.enum(["none", "low", "medium", "high", "xhigh", "max"]).default("none"),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
    AI_FALLBACK_TRANSIENT_COOLDOWN_MS: z.coerce.number().int().positive().default(30_000),
    AI_FALLBACK_QUOTA_COOLDOWN_MS: z.coerce.number().int().positive().default(900_000),

    OPENAI_API_KEY: z.string().default(""),
    OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
    OPENAI_EVALUATION_MODEL: z.string().min(1).default("gpt-6-luna"),
    OPENAI_INPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0.1),
    OPENAI_OUTPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0.5),
    OPENAI_REASONING_EFFORT: z.enum(["none", "low", "medium", "high", "xhigh", "max"]).default("none"),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

    OPENROUTER_API_KEY: z.string().default(""),

    FEEDBACK_SHADOW_MODE: z.enum(["none", "decision", "llm", "hybrid"]).default("none"),

    DECISION_PROVIDER_NAME: z.string().min(1).default("openrouter"),
    DECISION_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
    DECISION_API_KEY: z.string().default(""),
    DECISION_MODEL: z.string().min(1).default("typesafe/jev-1.13"),
    DECISION_INPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0.042),
    DECISION_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

    SHADOW_AI_PROVIDER_NAME: z.string().min(1).default("openrouter"),
    SHADOW_AI_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
    SHADOW_AI_API_KEY: z.string().default(""),
    SHADOW_AI_MODEL: z.string().min(1).default("openai/gpt-6-luna"),
    SHADOW_AI_INPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0.1),
    SHADOW_AI_OUTPUT_PRICE_PER_MILLION: z.coerce.number().nonnegative().default(0.5),
    SHADOW_AI_REASONING_EFFORT: z.enum(["none", "low", "medium", "high", "xhigh", "max"]).default("none"),

    LANGFUSE_PUBLIC_KEY: z.string().default(""),
    LANGFUSE_SECRET_KEY: z.string().default(""),
    LANGFUSE_BASE_URL: z.url().default("https://cloud.langfuse.com"),

    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_ACCESS_TOKEN: z.string().default(""),
    POLAR_WEBHOOK_SECRET: z.string().default(""),
    POLAR_PRODUCT_ID: z.string().default(""),
    BILLING_FREE_CREDITS: z.coerce.number().int().nonnegative().default(3),
    POLAR_SUCCESS_URL: z.string().min(1).default("http://localhost:3001/billing/success?checkout_id={CHECKOUT_ID}"),
    POLAR_RETURN_URL: z.url().default("http://localhost:3001/settings/billing"),
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV !== "production") return;

    if (environment.E2E_TEST_MODE) {
      context.addIssue({
        code: "custom",
        path: ["E2E_TEST_MODE"],
        message: "E2E_TEST_MODE cannot be enabled in production",
      });
    }

    const required: Array<[string, string]> = [
      ["GOOGLE_CLIENT_ID", environment.GOOGLE_CLIENT_ID],
      ["GOOGLE_CLIENT_SECRET", environment.GOOGLE_CLIENT_SECRET],
      ["POLAR_ACCESS_TOKEN", environment.POLAR_ACCESS_TOKEN],
      ["POLAR_WEBHOOK_SECRET", environment.POLAR_WEBHOOK_SECRET],
      ["POLAR_PRODUCT_ID", environment.POLAR_PRODUCT_ID],
      ["LANGFUSE_PUBLIC_KEY", environment.LANGFUSE_PUBLIC_KEY],
      ["LANGFUSE_SECRET_KEY", environment.LANGFUSE_SECRET_KEY],
      ["OPENAI_API_KEY", environment.OPENAI_API_KEY],
      ["DECISION_API_KEY", environment.DECISION_API_KEY || environment.OPENROUTER_API_KEY],
    ];

    if (environment.EMAIL_PROVIDER === "resend") {
      required.push(["RESEND_API_KEY", environment.RESEND_API_KEY]);
    }

    if (["llm", "hybrid"].includes(environment.FEEDBACK_SHADOW_MODE)) {
      required.push(["SHADOW_AI_API_KEY", environment.SHADOW_AI_API_KEY || environment.OPENROUTER_API_KEY]);
    }

    for (const [key, value] of required) {
      if (value) continue;

      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required in production`,
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

function removeBlankValues(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value || undefined]));
}

export function createEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(removeBlankValues(source));
}
