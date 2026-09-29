import { describe, expect, it } from "bun:test";
import { APICallError } from "ai";
import { type Ai, type AiStructuredGeneration, type AiStructuredResult, createFallbackAiAdapter } from "@/integrations/ai";

const generation = {
  system: "system",
  prompt: "prompt",
  output: { schema: {} as AiStructuredGeneration<{ verdict: string }>["output"]["schema"], name: "evaluation", description: "test" },
  temperature: 0,
  max_output_tokens: 100,
  function_id: "test",
  telemetry: { feedback_session_id: "session-1" },
} satisfies AiStructuredGeneration<{ verdict: string }>;

describe("fallback AI adapter", () => {
  it("uses the primary provider when it succeeds", async () => {
    let fallbackCalls = 0;
    const adapter = createFallbackAiAdapter({
      primary: resultAi("openai", "gpt-5.6-luna"),
      fallback: resultAi("ollama", "qwen3.5:9b", () => fallbackCalls++),
      transient_cooldown_ms: 30_000,
      quota_cooldown_ms: 900_000,
    });

    const result = await adapter.structured.create(generation);

    expect(result.provider).toBe("openai");
    expect(fallbackCalls).toBe(0);
  });

  it("falls back on exhausted credits and keeps the quota circuit open", async () => {
    let now = 1_000;
    let primaryCalls = 0;
    const fallbackTelemetry: Array<Record<string, string | number | boolean>> = [];
    const adapter = createFallbackAiAdapter({
      primary: failingAi(apiError(429, "credit_balance_exhausted"), () => primaryCalls++),
      fallback: resultAi("ollama", "qwen3.5:9b", undefined, fallbackTelemetry),
      transient_cooldown_ms: 30_000,
      quota_cooldown_ms: 900_000,
      now: () => now,
    });

    expect((await adapter.structured.create(generation)).provider).toBe("ollama");
    now += 1_000;
    expect((await adapter.structured.create(generation)).provider).toBe("ollama");

    expect(primaryCalls).toBe(1);
    expect(fallbackTelemetry[0]?.ai_fallback_reason).toBe("quota");
    expect(fallbackTelemetry[0]?.ai_fallback_circuit_open).toBe(false);
    expect(fallbackTelemetry[1]?.ai_fallback_circuit_open).toBe(true);
  });

  it("falls back on unavailable responses and models but not on invalid authentication", async () => {
    const fallback = resultAi("ollama", "qwen3.5:9b");
    const unavailable = createFallbackAiAdapter({
      primary: failingAi(apiError(503, "server_is_overloaded")),
      fallback,
      transient_cooldown_ms: 30_000,
      quota_cooldown_ms: 900_000,
    });
    const unavailableModel = createFallbackAiAdapter({
      primary: failingAi(apiError(404, "model_not_found")),
      fallback,
      transient_cooldown_ms: 30_000,
      quota_cooldown_ms: 900_000,
    });
    const unauthorizedError = apiError(401, "invalid_api_key");
    const unauthorized = createFallbackAiAdapter({
      primary: failingAi(unauthorizedError),
      fallback,
      transient_cooldown_ms: 30_000,
      quota_cooldown_ms: 900_000,
    });

    expect((await unavailable.structured.create(generation)).provider).toBe("ollama");
    expect((await unavailableModel.structured.create(generation)).provider).toBe("ollama");
    expect(unauthorized.structured.create(generation)).rejects.toBe(unauthorizedError);
  });
});

function resultAi(provider: string, model: string, onCall?: () => void, telemetry?: Array<Record<string, string | number | boolean>>): Ai {
  return {
    structured: {
      async create<Output>(input: AiStructuredGeneration<Output>): Promise<AiStructuredResult<Output>> {
        onCall?.();
        telemetry?.push(input.telemetry);

        return {
          output: { verdict: "correct" } as Output,
          provider,
          model,
          input_tokens: 10,
          output_tokens: 10,
          total_tokens: 20,
          estimated_cost_usd: 0,
          latency_ms: 10,
        };
      },
    },
  };
}

function failingAi(error: Error, onCall?: () => void): Ai {
  return {
    structured: {
      async create() {
        onCall?.();
        throw error;
      },
    },
  };
}

function apiError(statusCode: number, code: string): APICallError {
  return new APICallError({
    message: code,
    url: "https://api.openai.com/v1/responses",
    requestBodyValues: {},
    statusCode,
    responseBody: JSON.stringify({ error: { code } }),
    isRetryable: statusCode === 429 || statusCode >= 500,
  });
}
