import { describe, expect, it } from "bun:test";
import type { Transcript } from "@/integrations/transcription";
import type { FeedbackRawEvaluation } from "@/modules/feedback/feedback.contract";
import { feedbackEvaluationRule } from "@/modules/feedback/feedback.rule";

const transcript: Transcript = {
  text: "A planta transforma gás carbônico diretamente em oxigênio.",
  language: "pt",
  language_probability: 0.98,
  duration_seconds: 10,
  model: "turbo",
  segments: [
    {
      id: "seg_1",
      start_ms: 0,
      end_ms: 10_000,
      text: "A planta transforma gás carbônico diretamente em oxigênio.",
    },
  ],
};

function criterion(score: number) {
  return {
    score,
    feedback: "Evidence-based feedback",
    evidence: [{ segment_id: "seg_1", quote: "transforma gás carbônico" }],
  };
}

function rawEvaluation(scorable = true): FeedbackRawEvaluation {
  return {
    language: "pt-BR",
    scorable,
    insufficient_reason: scorable ? null : "No topical evidence",
    headline: "Partial understanding",
    summary: "The core mechanism needs correction.",
    rubric: {
      factual_accuracy: criterion(1),
      coverage: criterion(3),
      conceptual_reasoning: criterion(2),
      clarity: criterion(4),
    },
    understanding_map: [],
    reasoning_analysis: {
      observed_approach: "Inputs to outputs",
      what_worked: [],
      where_it_broke: [],
    },
    corrections: [
      {
        priority: 1,
        severity: "critical",
        student_claim: "CO2 becomes oxygen",
        segment_id: "seg_1",
        why_it_is_incorrect: "Oxygen is released from water.",
        correct_explanation: "Water splitting releases oxygen.",
        memory_hook: null,
      },
    ],
    strengths: [],
    improvement_plan: [],
    recommended_outline: [],
    follow_up_questions: [],
    uncertainties: [],
  };
}

describe("feedback evaluation rule", () => {
  it("computes mastery server-side and makes critical partial feedback deep", () => {
    const evaluation = feedbackEvaluationRule.create(rawEvaluation(), transcript);

    expect(evaluation.mastery).toBe(45);
    expect(evaluation.verdict).toBe("partial");
    expect(evaluation.depth).toBe("deep");
    expect(evaluation.corrections).toHaveLength(1);
  });

  it("does not score insufficient evidence", () => {
    const evaluation = feedbackEvaluationRule.create(rawEvaluation(false), transcript);

    expect(evaluation.mastery).toBeNull();
    expect(evaluation.verdict).toBe("insufficient");
    expect(evaluation.depth).toBe("concise");
  });

  it("grades continuous rubric scores with the same weights and critical cap", () => {
    expect(feedbackEvaluationRule.grade({ factual_accuracy: 3.6, coverage: 3.4, conceptual_reasoning: 3.5, has_critical: false })).toEqual({
      mastery: 88,
      verdict: "correct",
      depth: "concise",
    });
    expect(
      feedbackEvaluationRule.grade({ factual_accuracy: 3.6, coverage: 3.4, conceptual_reasoning: 3.5, has_critical: true }).verdict,
    ).toBe("partial");
  });

  it("rejects evidence that cannot be anchored to the transcript", () => {
    const raw = rawEvaluation();
    const [correction] = raw.corrections;

    if (!correction) throw new Error("The fixture must contain one correction.");

    raw.corrections[0] = { ...correction, segment_id: "invented" };

    expect(() => feedbackEvaluationRule.create(raw, transcript)).toThrow("does not exist");
  });
});
