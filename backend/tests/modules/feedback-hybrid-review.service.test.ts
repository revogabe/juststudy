import { describe, expect, it } from "bun:test";
import type { Ai } from "@/integrations/ai";
import { DecisionRequestError } from "@/integrations/decisions";
import type { Prompts } from "@/integrations/prompts";
import type { FeedbackDecisionResult, FeedbackReview, FeedbackReviewInput } from "@/modules/feedback";
import { createFeedbackHybridReviewService } from "@/modules/feedback";
import { feedbackEvaluationRule } from "@/modules/feedback/feedback.rule";

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
      { id: "seg_1", start_ms: 0, end_ms: 10_000, text: "A clorofila captura luz." },
      { id: "seg_2", start_ms: 10_000, end_ms: 20_000, text: "O oxigênio sai do gás carbônico." },
    ],
  },
};

const decided: FeedbackDecisionResult = {
  decision: {
    scorable: true,
    scorable_probability: 0.96,
    rubric: {
      factual_accuracy: { score: 1.6, confidence: 0.8 },
      coverage: { score: 2.4, confidence: 0.7 },
      conceptual_reasoning: { score: 1.9, confidence: 0.7 },
      clarity: { score: 3.7, confidence: 0.9 },
    },
    segments: [
      { segment_id: "seg_1", contradiction_probability: 0.03, severity: "minor", severity_confidence: 0.6 },
      { segment_id: "seg_2", contradiction_probability: 0.97, severity: "critical", severity_confidence: 0.9 },
    ],
    correction_segment_ids: ["seg_2"],
    mastery: 43,
    verdict: "partial",
    depth: "deep",
    confidence: 0.7,
  },
  provider: "openrouter",
  model: "typesafe/jev-1.13",
  question_version: "explanation-decision-v1",
  input_tokens: 2_900,
  output_tokens: 350,
  estimated_cost_usd: 0.00012,
  latency_ms: 300,
};

const criterion = { feedback: "Feedback", evidence: [{ segment_id: "seg_2", quote: "O oxigênio sai" }] };
const writtenCorrection = {
  student_claim: "O oxigênio sai do gás carbônico.",
  segment_id: "seg_2",
  why_it_is_incorrect: "O O2 liberado vem da água.",
  correct_explanation: "A fotólise da água libera oxigênio.",
  memory_hook: null,
};
const written = {
  language: "pt-BR",
  insufficient_reason: null,
  headline: "A origem do oxigênio precisa de correção",
  summary: "Você citou a clorofila, mas trocou a origem do oxigênio.",
  rubric: { factual_accuracy: criterion, coverage: criterion, conceptual_reasoning: criterion, clarity: criterion },
  understanding_map: [],
  reasoning_analysis: { observed_approach: "Lista de etapas", what_worked: [], where_it_broke: [] },
  corrections: [writtenCorrection],
  strengths: [],
  improvement_plan: [],
  recommended_outline: [],
  follow_up_questions: [],
  uncertainties: [],
};

const prompts: Prompts = {
  text: {
    async get(request) {
      return { text: request.variables.grading_decisions ?? "", version: "writer-test" };
    },
  },
};

function writer(output: unknown, prompts: string[] = []): Ai {
  return {
    structured: {
      async create(generation) {
        prompts.push(generation.prompt);

        return {
          output: generation.output.schema.parse(output),
          provider: "openai",
          model: "gpt-6-luna",
          input_tokens: 1_700,
          output_tokens: 1_400,
          total_tokens: 3_100,
          estimated_cost_usd: 0.00087,
          latency_ms: 9_000,
        };
      },
    },
  };
}

const unusedFallback: FeedbackReview = {
  explanation: {
    async create() {
      throw new Error("Fallback not expected");
    },
  },
};

describe("feedback hybrid review service", () => {
  it("keeps the decided grade, rounds it for the evaluation contract, and adds the written feedback", async () => {
    const prompted: string[] = [];
    const review = createFeedbackHybridReviewService({
      decision: { explanation: { create: async () => decided } },
      ai: writer(written, prompted),
      prompts,
      fallback: unusedFallback,
    });

    const result = await review.explanation.create(input);
    const evaluation = feedbackEvaluationRule.create(result.evaluation, input.transcript);

    expect(JSON.parse(prompted[0] ?? "{}")).toMatchObject({
      rubric_scores: { factual_accuracy: 2, coverage: 2, conceptual_reasoning: 2, clarity: 4 },
      corrections_to_explain: [{ segment_id: "seg_2", severity: "critical" }],
    });
    expect(evaluation).toMatchObject({ mastery: 50, verdict: "partial", depth: "deep" });
    expect(evaluation.corrections).toEqual([{ priority: 1, severity: "critical", ...writtenCorrection }]);
    expect(result).toMatchObject({
      provider: "openrouter+openai",
      model: "typesafe/jev-1.13+gpt-6-luna",
      prompt_version: "explanation-decision-v1+writer-test",
      total_tokens: 3_100,
      latency_ms: 9_300,
    });
    expect(result.estimated_cost_usd).toBeCloseTo(0.00099);
  });

  it("falls back to the full LLM review only when the decision provider is transiently unavailable", async () => {
    let fallbackCalls = 0;
    const fallback: FeedbackReview = {
      explanation: {
        async create() {
          fallbackCalls += 1;
          throw new Error("fallback reached");
        },
      },
    };
    const failingWith = (error: Error) =>
      createFeedbackHybridReviewService({
        decision: {
          explanation: {
            async create() {
              throw error;
            },
          },
        },
        ai: writer(written),
        prompts,
        fallback,
      });

    await expect(failingWith(new DecisionRequestError(529, "overloaded")).explanation.create(input)).rejects.toThrow("fallback reached");
    await expect(failingWith(new DecisionRequestError(401, "invalid key")).explanation.create(input)).rejects.toThrow("status 401");
    expect(fallbackCalls).toBe(1);
  });

  it("rejects written feedback that skips a decided correction", async () => {
    const review = createFeedbackHybridReviewService({
      decision: { explanation: { create: async () => decided } },
      ai: writer({ ...written, corrections: [] }),
      prompts,
      fallback: unusedFallback,
    });

    await expect(review.explanation.create(input)).rejects.toThrow("did not explain the correction for seg_2");
  });
});
