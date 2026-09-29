import type { Ai } from "@/integrations/ai";
import { DecisionRequestError } from "@/integrations/decisions";
import type { Prompts } from "@/integrations/prompts";
import { FEEDBACK_REVIEW_SCHEMA_VERSION } from "@/prompts/feedback/explanation-review.prompt";
import {
  FEEDBACK_WRITER_LOCAL_PROMPT,
  FEEDBACK_WRITER_LOCAL_PROMPT_VERSION,
  FEEDBACK_WRITER_PROMPT_LABEL,
  FEEDBACK_WRITER_PROMPT_NAME,
  FEEDBACK_WRITER_SYSTEM_PROMPT,
} from "@/prompts/feedback/explanation-writer.prompt";
import type {
  FeedbackDecision,
  FeedbackDecisionReview,
  FeedbackDecisionSegment,
  FeedbackRawEvaluation,
  FeedbackReview,
  FeedbackReviewInput,
  FeedbackReviewResult,
  FeedbackWrittenEvaluation,
} from "./feedback.contract";
import { feedbackEvaluationRule } from "./feedback.rule";
import { feedbackWrittenEvaluationSchema } from "./feedback-review.schema";

type FeedbackHybridReviewServiceInput = {
  decision: FeedbackDecisionReview;
  ai: Ai;
  prompts: Prompts;
  fallback: FeedbackReview;
};

type GradedRubric = Record<keyof FeedbackRawEvaluation["rubric"], number>;

const MAX_CORRECTIONS = 3;
const SEVERITY_RANK = { critical: 0, important: 1, minor: 2 } as const;

export function createFeedbackHybridReviewService(input: FeedbackHybridReviewServiceInput): FeedbackReview {
  return {
    explanation: {
      async create(reviewInput): Promise<FeedbackReviewResult> {
        const decided = await input.decision.explanation.create(reviewInput).catch((error: unknown) => {
          if (!isTransientDecisionFailure(error)) throw error;

          console.error("Feedback decision provider is unavailable; using the full LLM review.", error);
          return null;
        });
        if (!decided) return input.fallback.explanation.create(reviewInput);

        const rubric = roundRubric(decided.decision);
        const corrections = selectCorrections(decided.decision);
        const prompt = await getPrompt(input.prompts, reviewInput, decided.decision, rubric, corrections);
        const written = await input.ai.structured.create({
          system: FEEDBACK_WRITER_SYSTEM_PROMPT,
          prompt: prompt.text,
          output: {
            schema: feedbackWrittenEvaluationSchema,
            name: "explanation_feedback",
            description: "Student-facing feedback for decided grading results",
          },
          temperature: 0.1,
          max_output_tokens: 4000,
          function_id: "feedback.explanation.write",
          telemetry: {
            feedback_session_id: reviewInput.feedback_session_id,
            subject_slug: reviewInput.context.subject.slug,
            topic_slug: reviewInput.context.topic.slug,
            topic_level: reviewInput.context.topic.level,
            prompt_version: prompt.version,
            decision_model: decided.model,
            schema_version: FEEDBACK_REVIEW_SCHEMA_VERSION,
          },
        });

        // Billing meters generation tokens, so only the writer's tokens are reported; the decision cost stays in the estimate.
        return {
          evaluation_id: Bun.randomUUIDv7(),
          evaluation: mergeEvaluation(decided.decision, rubric, corrections, written.output),
          provider: `${decided.provider}+${written.provider}`,
          model: `${decided.model}+${written.model}`,
          prompt_version: `${decided.question_version}+${prompt.version}`,
          schema_version: FEEDBACK_REVIEW_SCHEMA_VERSION,
          input_tokens: written.input_tokens,
          output_tokens: written.output_tokens,
          total_tokens: written.total_tokens,
          estimated_cost_usd: decided.estimated_cost_usd + written.estimated_cost_usd,
          latency_ms: decided.latency_ms + written.latency_ms,
        };
      },
    },
  };
}

function isTransientDecisionFailure(error: unknown): boolean {
  if (error instanceof DecisionRequestError) return error.status === 408 || error.status === 429 || error.status >= 500;
  if (error instanceof DOMException) return error.name === "AbortError" || error.name === "TimeoutError";

  return error instanceof Error && "code" in error && typeof error.code === "string";
}

function roundRubric(decision: FeedbackDecision): GradedRubric {
  return {
    factual_accuracy: roundScore(decision.rubric.factual_accuracy.score),
    coverage: roundScore(decision.rubric.coverage.score),
    conceptual_reasoning: roundScore(decision.rubric.conceptual_reasoning.score),
    clarity: roundScore(decision.rubric.clarity.score),
  };
}

function roundScore(score: number): number {
  return Math.min(4, Math.max(0, Math.round(score)));
}

function selectCorrections(decision: FeedbackDecision): FeedbackDecisionSegment[] {
  if (!decision.scorable) return [];

  const flagged = new Set(decision.correction_segment_ids);

  return decision.segments
    .filter((segment) => flagged.has(segment.segment_id))
    .toSorted(
      (left, right) =>
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] || right.contradiction_probability - left.contradiction_probability,
    )
    .slice(0, MAX_CORRECTIONS);
}

function getPrompt(
  prompts: Prompts,
  input: FeedbackReviewInput,
  decision: FeedbackDecision,
  rubric: GradedRubric,
  corrections: FeedbackDecisionSegment[],
) {
  const grade = decision.scorable
    ? feedbackEvaluationRule.grade({
        factual_accuracy: rubric.factual_accuracy,
        coverage: rubric.coverage,
        conceptual_reasoning: rubric.conceptual_reasoning,
        has_critical: corrections.some((correction) => correction.severity === "critical"),
      })
    : null;

  return prompts.text.get({
    name: FEEDBACK_WRITER_PROMPT_NAME,
    label: FEEDBACK_WRITER_PROMPT_LABEL,
    fallback: FEEDBACK_WRITER_LOCAL_PROMPT,
    fallback_version: FEEDBACK_WRITER_LOCAL_PROMPT_VERSION,
    variables: {
      assessment_context: JSON.stringify(input.context.assessment),
      student_transcript: JSON.stringify(input.transcript.segments),
      grading_decisions: JSON.stringify({
        scorable: decision.scorable,
        rubric_scores: rubric,
        mastery: grade?.mastery ?? null,
        verdict: grade?.verdict ?? "insufficient",
        corrections_to_explain: corrections.map((correction) => ({ segment_id: correction.segment_id, severity: correction.severity })),
      }),
      output_language: input.transcript.language,
    },
  });
}

function mergeEvaluation(
  decision: FeedbackDecision,
  rubric: GradedRubric,
  corrections: FeedbackDecisionSegment[],
  written: FeedbackWrittenEvaluation,
): FeedbackRawEvaluation {
  const writtenCorrections = new Map(written.corrections.map((correction) => [correction.segment_id, correction]));

  return {
    ...written,
    scorable: decision.scorable,
    insufficient_reason: decision.scorable ? null : written.insufficient_reason,
    rubric: {
      factual_accuracy: { score: rubric.factual_accuracy, ...written.rubric.factual_accuracy },
      coverage: { score: rubric.coverage, ...written.rubric.coverage },
      conceptual_reasoning: { score: rubric.conceptual_reasoning, ...written.rubric.conceptual_reasoning },
      clarity: { score: rubric.clarity, ...written.rubric.clarity },
    },
    corrections: corrections.map((correction, index) => {
      const text = writtenCorrections.get(correction.segment_id);
      if (!text) throw new Error(`The feedback writer did not explain the correction for ${correction.segment_id}.`);

      return { priority: index + 1, severity: correction.severity, ...text };
    }),
  };
}
