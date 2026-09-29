import type { Transcript } from "@/integrations/transcription";
import type { KnowledgeAssessmentContext, KnowledgeLevel } from "@/modules/knowledge";
import type { FEEDBACK_STATUSES } from "./feedback.constant";

export type FeedbackEvaluationEvidence = {
  segment_id: string;
  quote: string;
};

export type FeedbackEvaluationCriterion = {
  score: number;
  feedback: string;
  evidence: FeedbackEvaluationEvidence[];
};

export type FeedbackRawEvaluation = {
  language: string;
  scorable: boolean;
  insufficient_reason: string | null;
  headline: string;
  summary: string;
  rubric: {
    factual_accuracy: FeedbackEvaluationCriterion;
    coverage: FeedbackEvaluationCriterion;
    conceptual_reasoning: FeedbackEvaluationCriterion;
    clarity: FeedbackEvaluationCriterion;
  };
  understanding_map: Array<{
    concept: string;
    status: "correct" | "partial" | "incorrect" | "missing";
    feedback: string;
  }>;
  reasoning_analysis: {
    observed_approach: string;
    what_worked: string[];
    where_it_broke: Array<{
      step: string;
      problem: string;
      consequence: string;
      better_connection: string;
    }>;
  };
  corrections: Array<{
    priority: number;
    severity: "minor" | "important" | "critical";
    student_claim: string;
    segment_id: string;
    why_it_is_incorrect: string;
    correct_explanation: string;
    memory_hook: string | null;
  }>;
  strengths: Array<{
    title: string;
    detail: string;
    evidence_segment_ids: string[];
  }>;
  improvement_plan: Array<{
    step: number;
    action: string;
    success_criterion: string;
  }>;
  recommended_outline: string[];
  follow_up_questions: Array<{
    question: string;
    purpose: string;
  }>;
  uncertainties: string[];
};

export type FeedbackReviewInput = {
  feedback_session_id: string;
  context: KnowledgeAssessmentContext;
  transcript: Transcript;
};

export type FeedbackReviewResult = {
  evaluation_id: string;
  evaluation: FeedbackRawEvaluation;
  provider: string;
  model: string;
  prompt_version: string;
  schema_version: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
};

export type FeedbackReview = {
  explanation: {
    create(input: FeedbackReviewInput): Promise<FeedbackReviewResult>;
  };
};

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export type FeedbackDepth = "concise" | "standard" | "deep";
export type FeedbackVerdict = "correct" | "mostly_correct" | "partial" | "incorrect" | "insufficient";
export type FeedbackCorrectionSeverity = FeedbackRawEvaluation["corrections"][number]["severity"];

export type FeedbackRubricGrade = {
  factual_accuracy: number;
  coverage: number;
  conceptual_reasoning: number;
  has_critical: boolean;
};

export type FeedbackDecisionSegment = {
  segment_id: string;
  contradiction_probability: number;
  severity: FeedbackCorrectionSeverity;
  severity_confidence: number;
};

export type FeedbackDecision = {
  scorable: boolean;
  scorable_probability: number;
  rubric: Record<keyof FeedbackRawEvaluation["rubric"], { score: number; confidence: number }>;
  segments: FeedbackDecisionSegment[];
  correction_segment_ids: string[];
  mastery: number | null;
  verdict: FeedbackVerdict;
  depth: FeedbackDepth;
  confidence: number;
};

export type FeedbackDecisionResult = {
  decision: FeedbackDecision;
  provider: string;
  model: string;
  question_version: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
};

export type FeedbackDecisionReview = {
  explanation: {
    create(input: FeedbackReviewInput): Promise<FeedbackDecisionResult>;
  };
};

export type FeedbackWrittenEvaluation = Omit<FeedbackRawEvaluation, "scorable" | "rubric" | "corrections"> & {
  rubric: Record<keyof FeedbackRawEvaluation["rubric"], Omit<FeedbackEvaluationCriterion, "score">>;
  corrections: Array<Omit<FeedbackRawEvaluation["corrections"][number], "priority" | "severity">>;
};

export type FeedbackShadowMode = "decision" | "llm" | "hybrid";

export type FeedbackShadowReviewer =
  | { mode: "decision"; review: FeedbackDecisionReview }
  | { mode: "llm" | "hybrid"; review: FeedbackReview };

export type FeedbackShadowReviewWrite = {
  feedback_session_id: string;
  mode: FeedbackShadowMode;
  status: "completed" | "failed";
  provider: string | null;
  model: string | null;
  scorable: boolean | null;
  mastery: number | null;
  verdict: FeedbackVerdict | null;
  correction_segment_ids: string[];
  confidence: number | null;
  primary_mastery: number | null;
  primary_verdict: FeedbackVerdict | null;
  decision: FeedbackDecision | null;
  evaluation: FeedbackEvaluation | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  error_code: string | null;
  created_at: Date;
};

export type FeedbackEvaluation = FeedbackRawEvaluation & {
  mastery: number | null;
  verdict: FeedbackVerdict;
  depth: FeedbackDepth;
};

export type FeedbackSessionRecord = {
  id: string;
  focus_session_id: string;
  randomization_id: string;
  user_id: string;
  subject_slug: string;
  subject_name: string;
  topic_slug: string;
  topic_name: string;
  topic_level: KnowledgeLevel;
  assessment_context: KnowledgeAssessmentContext;
  status: FeedbackStatus;
  started_at: Date;
  recording_ends_at: Date;
  upload_ends_at: Date;
  last_seen_at: Date;
  submitted_at: Date | null;
  completed_at: Date | null;
  transcript: Transcript | null;
  evaluation_id: string | null;
  evaluation: FeedbackEvaluation | null;
  evaluation_provider: string | null;
  evaluation_model: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  evaluation_latency_ms: number | null;
  score_before: number | null;
  score_after: number | null;
  score_algorithm_version: string | null;
  process_attempts: number;
  next_attempt_at: Date | null;
  lease_until: Date | null;
  error_code: string | null;
  usage_synced_at: Date | null;
  updated_at: Date;
};

export type FeedbackSession = Omit<
  FeedbackSessionRecord,
  "user_id" | "assessment_context" | "lease_until" | "process_attempts" | "next_attempt_at" | "usage_synced_at"
>;

export type FeedbackSessionStart = {
  focus_session_id: string;
  user_id: string;
};

export type FeedbackSessionCommand = {
  session_id: string;
  user_id: string;
};

export type FeedbackSessionCreate = {
  focus_session_id: string;
  randomization_id: string;
  user_id: string;
  context: KnowledgeAssessmentContext;
  started_at: Date;
  recording_ends_at: Date;
  upload_ends_at: Date;
};

export type FeedbackAudioSubmit = FeedbackSessionCommand & {
  bytes: Uint8Array;
  filename: string;
  media_type: string;
};

export type FeedbackHistoryQuery = {
  user_id: string;
  limit: number;
  cursor: string | null;
};

export type FeedbackHistoryPage = {
  feedback: FeedbackSessionRecord[];
  next_cursor: string | null;
};

export type FeedbackEvaluationWrite = {
  session_id: string;
  result: FeedbackReviewResult;
  evaluation: FeedbackEvaluation;
  updated_at: Date;
};
