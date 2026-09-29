import { describe, expect, it } from "bun:test";
import type { DecisionAnswer, DecisionQuestion, Decisions } from "@/integrations/decisions";
import { createFeedbackDecisionService, type FeedbackReviewInput } from "@/modules/feedback";

const input: FeedbackReviewInput = {
  feedback_session_id: "session-1",
  context: {
    subject: { slug: "biology", name: "Biologia" },
    topic: { slug: "photosynthesis", name: "Fotossíntese", level: "intermediate" },
    assessment: {
      reference_summary: "O oxigênio liberado vem da água.",
      key_concepts: ["Fotólise da água"],
      common_misconceptions: ["O oxigênio vem do CO2"],
      version: "test",
    },
  },
  transcript: {
    text: "A clorofila captura luz. O oxigênio sai do gás carbônico.",
    language: "pt",
    language_probability: 0.98,
    duration_seconds: 20,
    model: "turbo",
    segments: [
      { id: "segment-0001", start_ms: 0, end_ms: 10_000, text: "A clorofila captura luz." },
      { id: "segment-0002", start_ms: 10_000, end_ms: 20_000, text: "O oxigênio sai do gás carbônico." },
    ],
  },
};

function decisionsReturning(overrides: Record<string, DecisionAnswer>, requested: Array<Record<string, DecisionQuestion>> = []): Decisions {
  return {
    answer: {
      async create(request) {
        requested.push(request.questions);
        const answers: Record<string, DecisionAnswer> = {
          scorable: { type: "noul", probability: 0.95 },
          factual_accuracy: score(2),
          coverage: score(2),
          conceptual_reasoning: score(2),
          clarity: score(4),
          contradiction_0: { type: "noul", probability: 0.05 },
          contradiction_1: { type: "noul", probability: 0.97 },
          severity_0: choice("minor"),
          severity_1: choice("critical"),
          ...overrides,
        };

        return {
          answers: answers as never,
          provider: "openrouter",
          model: "typesafe/jev-1.13",
          input_tokens: 900,
          output_tokens: 80,
          estimated_cost_usd: 0.0000378,
          latency_ms: 240,
        };
      },
    },
  };
}

function score(value: number): DecisionAnswer {
  return { type: "score", score: value, confidence: 0.9, probabilities: [0, 0, 1, 0, 0] };
}

function choice(value: string): DecisionAnswer {
  return { type: "choice", choice: value, confidence: 0.8, probabilities: { [value]: 0.9 } };
}

describe("feedback decision service", () => {
  it("asks one contradiction and severity question per segment and grades with the evaluation rule", async () => {
    const requested: Array<Record<string, DecisionQuestion>> = [];
    const review = createFeedbackDecisionService({ decisions: decisionsReturning({}, requested) });

    const result = await review.explanation.create(input);

    expect(Object.keys(requested[0] ?? {})).toContain("contradiction_1");
    expect(result.decision.correction_segment_ids).toEqual(["segment-0002"]);
    expect(result.decision.mastery).toBe(50);
    expect(result.decision.verdict).toBe("partial");
    expect(result.decision.depth).toBe("deep");
    expect(result.decision.confidence).toBeCloseTo(0.8);
    expect(result.question_version).toBe("explanation-decision-v1");
  });

  it("does not grade an unscorable transcript", async () => {
    const review = createFeedbackDecisionService({
      decisions: decisionsReturning({ scorable: { type: "noul", probability: 0.1 } }),
    });

    const result = await review.explanation.create(input);

    expect(result.decision.mastery).toBeNull();
    expect(result.decision.verdict).toBe("insufficient");
    expect(result.decision.correction_segment_ids).toEqual([]);
  });

  it("rejects a severity outside the correction contract", async () => {
    const review = createFeedbackDecisionService({ decisions: decisionsReturning({ severity_1: choice("fatal") }) });

    expect(review.explanation.create(input)).rejects.toThrow("unknown severity");
  });
});
