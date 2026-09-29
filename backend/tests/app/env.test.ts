import { describe, expect, it } from "bun:test";
import { createEnvironment } from "@/app/env";

describe("createEnvironment", () => {
  it("parses defaults and keeps public configuration explicit", () => {
    const environment = createEnvironment({
      APP_ENV: "test",
      DATABASE_URL: "postgres://localhost/juststudy_test",
      KNOWLEDGE_CATALOG_TOKEN: "test-knowledge-catalog-token-32-characters",
      AUTH_SECRET: "test-secret-with-at-least-32-characters",
    });

    expect(environment.APP_PORT).toBe(3000);
    expect(environment.E2E_TEST_MODE).toBe(false);
    expect(environment.EMAIL_PROVIDER).toBe("mailpit");
    expect(environment.BILLING_FREE_CREDITS).toBe(3);
    expect(environment.AI_PROVIDER_NAME).toBe("ollama");
    expect(environment.AI_EVALUATION_MODEL).toBe("qwen3.5:9b");
    expect(environment.AI_INPUT_PRICE_PER_MILLION).toBe(0);
    expect(environment.OPENROUTER_EVALUATION_MODEL).toBe("openai/gpt-6-luna");
    expect(environment.OPENROUTER_INPUT_PRICE_PER_MILLION).toBe(0.1);
    expect(environment.DECISION_MODEL).toBe("typesafe/jev-1.13");
    expect(environment.FEEDBACK_SHADOW_MODE).toBe("none");
    expect(environment.KNOWLEDGE_ASSESSMENT_GENERATION).toBe(false);
  });

  it("refuses incomplete production provider configuration", () => {
    expect(() =>
      createEnvironment({
        APP_ENV: "production",
        DATABASE_URL: "postgres://localhost/juststudy",
        KNOWLEDGE_CATALOG_TOKEN: "production-knowledge-catalog-token-32-characters",
        AUTH_SECRET: "production-secret-with-at-least-32-characters",
      }),
    ).toThrow();
  });

  it("accepts production when OpenRouter and the other providers are configured", () => {
    const environment = createEnvironment({
      APP_ENV: "production",
      DATABASE_URL: "postgres://localhost/juststudy",
      KNOWLEDGE_CATALOG_TOKEN: "production-knowledge-catalog-token-32-characters",
      AUTH_SECRET: "production-secret-with-at-least-32-characters",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      POLAR_ACCESS_TOKEN: "polar-token",
      POLAR_WEBHOOK_SECRET: "polar-webhook",
      POLAR_PRODUCT_ID: "polar-product",
      LANGFUSE_PUBLIC_KEY: "langfuse-public",
      LANGFUSE_SECRET_KEY: "langfuse-secret",
      OPENROUTER_API_KEY: "openrouter-key",
    });

    expect(environment.OPENROUTER_EVALUATION_MODEL).toBe("openai/gpt-6-luna");
    expect(environment.AI_EVALUATION_MODEL).toBe("qwen3.5:9b");
  });

  it("requires the single OpenRouter key in production for every model", () => {
    const production = {
      APP_ENV: "production",
      DATABASE_URL: "postgres://localhost/juststudy",
      KNOWLEDGE_CATALOG_TOKEN: "production-knowledge-catalog-token-32-characters",
      AUTH_SECRET: "production-secret-with-at-least-32-characters",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      POLAR_ACCESS_TOKEN: "polar-token",
      POLAR_WEBHOOK_SECRET: "polar-webhook",
      POLAR_PRODUCT_ID: "polar-product",
      LANGFUSE_PUBLIC_KEY: "langfuse-public",
      LANGFUSE_SECRET_KEY: "langfuse-secret",
    };

    expect(() => createEnvironment(production)).toThrow("OPENROUTER_API_KEY");
    expect(
      createEnvironment({ ...production, OPENROUTER_API_KEY: "openrouter-key", FEEDBACK_SHADOW_MODE: "llm" }).FEEDBACK_SHADOW_MODE,
    ).toBe("llm");
  });

  it("never allows the E2E entitlement switch in production", () => {
    expect(() =>
      createEnvironment({
        APP_ENV: "production",
        E2E_TEST_MODE: "true",
        DATABASE_URL: "postgres://localhost/juststudy",
        KNOWLEDGE_CATALOG_TOKEN: "production-knowledge-catalog-token-32-characters",
        AUTH_SECRET: "production-secret-with-at-least-32-characters",
      }),
    ).toThrow("E2E_TEST_MODE cannot be enabled in production");
  });
});
