import { describe, expect, it } from "bun:test";
import type { Ai } from "@/integrations/ai";
import type { Prompts, TextPromptInput } from "@/integrations/prompts";
import type { FeedbackRawEvaluation } from "@/modules/feedback";
import { createFeedbackReviewService } from "@/modules/feedback";

const rawEvaluation: FeedbackRawEvaluation = {
  language: "pt",
  scorable: false,
  insufficient_reason: "Pouca evidência.",
  headline: "Explique um pouco mais",
  summary: "A resposta ainda não demonstra o conceito.",
  rubric: {
    factual_accuracy: { score: 0, feedback: "Sem evidência.", evidence: [{ segment_id: "seg_1", quote: "Força muda" }] },
    coverage: { score: 0, feedback: "Sem evidência.", evidence: [{ segment_id: "seg_1", quote: "Força muda" }] },
    conceptual_reasoning: { score: 0, feedback: "Sem evidência.", evidence: [{ segment_id: "seg_1", quote: "Força muda" }] },
    clarity: { score: 1, feedback: "Resposta curta.", evidence: [{ segment_id: "seg_1", quote: "Força muda" }] },
  },
  understanding_map: [],
  reasoning_analysis: { observed_approach: "Não observável.", what_worked: [], where_it_broke: [] },
  corrections: [],
  strengths: [],
  improvement_plan: [],
  recommended_outline: [],
  follow_up_questions: [],
  uncertainties: [],
};

describe("feedback review service", () => {
  it("owns the pedagogical prompt while delegating structured generation to AI", async () => {
    const promptInputs: TextPromptInput[] = [];
    let generatedPrompt = "";
    let functionId = "";
    let topicSlug = "";
    const prompts: Prompts = {
      text: {
        async get(input) {
          promptInputs.push(input);
          return { text: "Compiled feedback prompt", version: "7" };
        },
      },
    };
    const ai: Ai = {
      structured: {
        async create(input) {
          generatedPrompt = input.prompt;
          functionId = input.function_id;
          topicSlug = String(input.telemetry.topic_slug);

          return {
            output: input.output.schema.parse(rawEvaluation),
            provider: "ollama",
            model: "qwen3.5:9b",
            input_tokens: 100,
            output_tokens: 200,
            total_tokens: 300,
            estimated_cost_usd: 0.00004,
            latency_ms: 250,
          };
        },
      },
    };
    const review = createFeedbackReviewService({ ai, prompts });
    const result = await review.explanation.create({
      feedback_session_id: "feedback-1",
      context: {
        subject: { slug: "physics", name: "Physics" },
        topic: { slug: "newtons-laws", name: "Newton's Laws", level: "beginner" },
        assessment: {
          reference_summary: "Forces change motion.",
          key_concepts: ["Force", "Mass", "Acceleration"],
          common_misconceptions: ["Motion requires constant force"],
          version: "test-v1",
        },
      },
      transcript: {
        text: "Força muda o movimento.",
        language: "pt",
        language_probability: 0.99,
        duration_seconds: 4,
        model: "turbo",
        segments: [{ id: "seg_1", start_ms: 0, end_ms: 4000, text: "Força muda o movimento." }],
      },
    });

    expect(promptInputs[0]).toMatchObject({
      name: "feedback-explanation-evaluator",
      label: "production",
      fallback_version: "local-v1",
    });
    expect(promptInputs[0]?.variables.student_transcript).toContain("seg_1");
    expect(generatedPrompt).toBe("Compiled feedback prompt");
    expect(functionId).toBe("feedback.explanation.review");
    expect(topicSlug).toBe("newtons-laws");
    expect(result).toMatchObject({
      evaluation: rawEvaluation,
      provider: "ollama",
      prompt_version: "7",
      schema_version: "explanation-evaluation-v1",
      total_tokens: 300,
    });
  });
});
