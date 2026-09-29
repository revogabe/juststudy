import type {
  DecisionChoiceQuestion,
  DecisionNoulQuestion,
  DecisionResult,
  DecisionScoreQuestion,
  Decisions,
} from "@/integrations/decisions";
import {
  FEEDBACK_DECISION_CONTRADICTION_QUESTION,
  FEEDBACK_DECISION_QUESTION_VERSION,
  FEEDBACK_DECISION_RUBRIC_QUESTIONS,
  FEEDBACK_DECISION_SCORABLE_QUESTION,
  FEEDBACK_DECISION_SEVERITY_QUESTION,
} from "@/prompts/feedback/explanation-decision.prompt";
import type {
  FeedbackCorrectionSeverity,
  FeedbackDecision,
  FeedbackDecisionResult,
  FeedbackDecisionReview,
  FeedbackReviewInput,
} from "./feedback.contract";
import { feedbackEvaluationRule } from "./feedback.rule";

type FeedbackDecisionServiceInput = {
  decisions: Decisions;
};

type ExplanationQuestions = {
  scorable: DecisionNoulQuestion;
  factual_accuracy: DecisionScoreQuestion;
  coverage: DecisionScoreQuestion;
  conceptual_reasoning: DecisionScoreQuestion;
  clarity: DecisionScoreQuestion;
} & Record<`contradiction_${number}`, DecisionNoulQuestion> &
  Record<`severity_${number}`, DecisionChoiceQuestion>;

const DECISION_THRESHOLD = 0.5;

export function createFeedbackDecisionService(input: FeedbackDecisionServiceInput): FeedbackDecisionReview {
  return {
    explanation: {
      async create(reviewInput): Promise<FeedbackDecisionResult> {
        const result = await input.decisions.answer.create({
          state: explanationState(reviewInput),
          questions: explanationQuestions(reviewInput),
          function_id: "feedback.explanation.decision",
        });

        return {
          decision: explanationDecision(reviewInput, result.answers),
          provider: result.provider,
          model: result.model,
          question_version: FEEDBACK_DECISION_QUESTION_VERSION,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          estimated_cost_usd: result.estimated_cost_usd,
          latency_ms: result.latency_ms,
        };
      },
    },
  };
}

function explanationState(input: FeedbackReviewInput) {
  return {
    subject: input.context.subject.name,
    topic: input.context.topic.name,
    topic_level: input.context.topic.level,
    reference_summary: input.context.assessment.reference_summary,
    key_concepts: input.context.assessment.key_concepts,
    common_misconceptions: input.context.assessment.common_misconceptions,
    student_transcript: input.transcript.segments.map((segment, index) => ({ segment: index + 1, text: segment.text })),
  };
}

function explanationQuestions(input: FeedbackReviewInput): ExplanationQuestions {
  const questions: ExplanationQuestions = {
    scorable: { type: "noul", ...FEEDBACK_DECISION_SCORABLE_QUESTION },
    factual_accuracy: { type: "score", ...FEEDBACK_DECISION_RUBRIC_QUESTIONS.factual_accuracy },
    coverage: { type: "score", ...FEEDBACK_DECISION_RUBRIC_QUESTIONS.coverage },
    conceptual_reasoning: { type: "score", ...FEEDBACK_DECISION_RUBRIC_QUESTIONS.conceptual_reasoning },
    clarity: { type: "score", ...FEEDBACK_DECISION_RUBRIC_QUESTIONS.clarity },
  };

  for (const [index, segment] of input.transcript.segments.entries()) {
    const target = { segment: index + 1, text: segment.text };

    questions[`contradiction_${index}`] = {
      type: "noul",
      instructions: { ...target, question: FEEDBACK_DECISION_CONTRADICTION_QUESTION.question },
      criteria: FEEDBACK_DECISION_CONTRADICTION_QUESTION.criteria,
    };
    questions[`severity_${index}`] = {
      type: "choice",
      instructions: { ...target, question: FEEDBACK_DECISION_SEVERITY_QUESTION.question },
      criteria: FEEDBACK_DECISION_SEVERITY_QUESTION.criteria,
    };
  }

  return questions;
}

function explanationDecision(input: FeedbackReviewInput, answers: DecisionResult<ExplanationQuestions>["answers"]): FeedbackDecision {
  const scorableProbability = answers.scorable.probability;
  const scorable = scorableProbability >= DECISION_THRESHOLD;
  const rubric = {
    factual_accuracy: { score: answers.factual_accuracy.score, confidence: answers.factual_accuracy.confidence },
    coverage: { score: answers.coverage.score, confidence: answers.coverage.confidence },
    conceptual_reasoning: { score: answers.conceptual_reasoning.score, confidence: answers.conceptual_reasoning.confidence },
    clarity: { score: answers.clarity.score, confidence: answers.clarity.confidence },
  };
  const segments = input.transcript.segments.map((segment, index) => {
    const contradiction = answers[`contradiction_${index}`];
    const severity = answers[`severity_${index}`];
    if (!contradiction || !severity) throw new Error(`The decision provider omitted answers for segment ${segment.id}.`);

    return {
      segment_id: segment.id,
      contradiction_probability: contradiction.probability,
      severity: severityFor(severity.choice),
      severity_confidence: severity.confidence,
    };
  });
  const corrections = segments.filter((segment) => segment.contradiction_probability >= DECISION_THRESHOLD);
  const decisiveness = [Math.abs(2 * scorableProbability - 1)];

  if (!scorable) {
    return {
      scorable,
      scorable_probability: scorableProbability,
      rubric,
      segments,
      correction_segment_ids: [],
      mastery: null,
      verdict: "insufficient",
      depth: "concise",
      confidence: Math.min(...decisiveness),
    };
  }

  decisiveness.push(rubric.factual_accuracy.confidence, rubric.coverage.confidence, rubric.conceptual_reasoning.confidence);
  for (const segment of segments) decisiveness.push(Math.abs(2 * segment.contradiction_probability - 1));
  for (const segment of corrections) decisiveness.push(segment.severity_confidence);

  return {
    scorable,
    scorable_probability: scorableProbability,
    rubric,
    segments,
    correction_segment_ids: corrections.map((segment) => segment.segment_id),
    ...feedbackEvaluationRule.grade({
      factual_accuracy: rubric.factual_accuracy.score,
      coverage: rubric.coverage.score,
      conceptual_reasoning: rubric.conceptual_reasoning.score,
      has_critical: corrections.some((segment) => segment.severity === "critical"),
    }),
    confidence: Math.min(...decisiveness),
  };
}

function severityFor(choice: string): FeedbackCorrectionSeverity {
  if (choice === "minor" || choice === "important" || choice === "critical") return choice;

  throw new Error(`The decision provider returned an unknown severity: ${choice}.`);
}
