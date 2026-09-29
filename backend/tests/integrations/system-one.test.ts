import { describe, expect, it } from "bun:test";
import { createSystemOneAdapter, DecisionRequestError } from "@/integrations/decisions";

const questions = {
  contradicts: { type: "noul" as const, instructions: "Does the segment contradict the reference?" },
  severity: {
    type: "choice" as const,
    instructions: "How severe is the error?",
    criteria: { minor: "Small", critical: "Core" },
  },
  accuracy: { type: "score" as const, instructions: "How accurate is it?", criteria: ["Wrong", "Mixed", "Right"] },
};

function adapter(response: Response, requests: Request[] = []) {
  return createSystemOneAdapter({
    provider_name: "openrouter",
    base_url: "https://decisions.test/api/v1",
    api_key: "test-key",
    model: "typesafe/jev-1.13",
    input_price_per_million: 0.042,
    timeout_ms: 1_000,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return response;
    }) as typeof fetch,
  });
}

describe("System One decision adapter", () => {
  it("sends typed questions and maps every answer into the neutral contract", async () => {
    const requests: Request[] = [];
    const decisions = adapter(
      Response.json({
        model: "typesafe/jev-1.13-20260917",
        answers: {
          contradicts: { type: "noul", noul: 0.98 },
          severity: { type: "choice", choice: "critical", confidence: 0.9, probabilities: { minor: 0.06, critical: 0.94 } },
          accuracy: { type: "score", score: 0.2, confidence: 0.8, legend: {}, probabilities: { "0": 0.85, "1": 0.1, "2": 0.05 } },
        },
        usage: { input_tokens: 1_000, output_tokens: 70 },
      }),
      requests,
    );

    const result = await decisions.answer.create({ state: { segment: "O oxigênio sai do CO2." }, questions, function_id: "test" });

    const request = requests[0];
    expect(request?.url).toBe("https://decisions.test/api/v1/systemone");
    expect(request?.headers.get("authorization")).toBe("Bearer test-key");
    expect(await request?.json()).toEqual({ model: "typesafe/jev-1.13", state: { segment: "O oxigênio sai do CO2." }, questions });
    expect(result.answers.contradicts.probability).toBe(0.98);
    expect(result.answers.severity.choice).toBe("critical");
    expect(result.answers.accuracy.probabilities).toEqual([0.85, 0.1, 0.05]);
    expect(result.model).toBe("typesafe/jev-1.13-20260917");
    expect(result.estimated_cost_usd).toBeCloseTo(0.000042);
  });

  it("rejects provider errors and answers that do not match the requested question type", async () => {
    const rejected = adapter(new Response("rate limited", { status: 429 }));
    const mismatched = adapter(
      Response.json({
        model: "kev-latest",
        answers: { contradicts: { type: "choice", choice: "yes", confidence: 1, probabilities: { yes: 1 } } },
        usage: { input_tokens: 10, output_tokens: 1 },
      }),
    );
    const request = { state: "text", questions: { contradicts: questions.contradicts }, function_id: "test" };

    expect(rejected.answer.create(request)).rejects.toBeInstanceOf(DecisionRequestError);
    expect(mismatched.answer.create(request)).rejects.toThrow("no noul answer for contradicts");
  });
});
