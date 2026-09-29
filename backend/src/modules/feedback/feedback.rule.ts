import type { Transcript } from "@/integrations/transcription";
import { FEEDBACK_AUDIO_MEDIA_TYPES, FEEDBACK_INACTIVITY_SECONDS, FEEDBACK_MAX_AUDIO_BYTES } from "./feedback.constant";
import type {
  FeedbackDepth,
  FeedbackEvaluation,
  FeedbackRawEvaluation,
  FeedbackRubricGrade,
  FeedbackSessionRecord,
  FeedbackVerdict,
} from "./feedback.contract";
import { feedbackError } from "./feedback.error";

function validateAudio(input: { bytes: Uint8Array; media_type: string }): void {
  if (!FEEDBACK_AUDIO_MEDIA_TYPES.includes(input.media_type as never))
    throw feedbackError.audioInvalid("The audio media type is not supported.");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > FEEDBACK_MAX_AUDIO_BYTES)
    throw feedbackError.audioInvalid("The audio must contain data and be at most 32 MiB.");
}

function isExpired(session: FeedbackSessionRecord, now: Date): boolean {
  if (session.status !== "active") return false;

  const inactiveAt = new Date(session.last_seen_at.getTime() + FEEDBACK_INACTIVITY_SECONDS * 1000);

  return now >= session.upload_ends_at || now >= inactiveAt;
}

function createEvaluation(raw: FeedbackRawEvaluation, transcript: Transcript): FeedbackEvaluation {
  const validSegmentIds = new Set(transcript.segments.map((segment) => segment.id));
  validateEvidence(raw, validSegmentIds);
  const sanitized = sanitizeEvidence(raw, validSegmentIds);

  if (!sanitized.scorable) {
    return {
      ...sanitized,
      insufficient_reason: sanitized.insufficient_reason?.trim() || "The transcript does not contain enough topical evidence to evaluate.",
      mastery: null,
      verdict: "insufficient",
      depth: "concise",
    };
  }

  return {
    ...sanitized,
    ...gradeRubric({
      factual_accuracy: sanitized.rubric.factual_accuracy.score,
      coverage: sanitized.rubric.coverage.score,
      conceptual_reasoning: sanitized.rubric.conceptual_reasoning.score,
      has_critical: sanitized.corrections.some((correction) => correction.severity === "critical"),
    }),
  };
}

function gradeRubric(input: FeedbackRubricGrade): { mastery: number; verdict: FeedbackVerdict; depth: FeedbackDepth } {
  const mastery = Math.round((100 * (0.5 * input.factual_accuracy + 0.3 * input.coverage + 0.2 * input.conceptual_reasoning)) / 4);

  return {
    mastery,
    verdict: verdictFor(mastery, input.has_critical),
    depth: depthFor(mastery, input.has_critical),
  };
}

function validateEvidence(raw: FeedbackRawEvaluation, validSegmentIds: Set<string>): void {
  const referencedIds = [
    ...Object.values(raw.rubric).flatMap((criterion) => criterion.evidence.map((evidence) => evidence.segment_id)),
    ...raw.corrections.map((correction) => correction.segment_id),
    ...raw.strengths.flatMap((strength) => strength.evidence_segment_ids),
  ];

  if (referencedIds.some((segmentId) => !validSegmentIds.has(segmentId)))
    throw new Error("The evaluation referenced a transcript segment that does not exist.");

  if (
    raw.scorable &&
    [raw.rubric.factual_accuracy, raw.rubric.coverage, raw.rubric.conceptual_reasoning].some((criterion) => criterion.evidence.length === 0)
  )
    throw new Error("A scorable evaluation must anchor every mastery criterion to the transcript.");
}

function sanitizeEvidence(raw: FeedbackRawEvaluation, validSegmentIds: Set<string>): FeedbackRawEvaluation {
  const rubric = Object.fromEntries(
    Object.entries(raw.rubric).map(([name, criterion]) => [
      name,
      {
        ...criterion,
        evidence: criterion.evidence.filter((evidence) => validSegmentIds.has(evidence.segment_id)),
      },
    ]),
  ) as FeedbackRawEvaluation["rubric"];

  return {
    ...raw,
    rubric,
    corrections: raw.corrections.filter((correction) => validSegmentIds.has(correction.segment_id)),
    strengths: raw.strengths.map((strength) => ({
      ...strength,
      evidence_segment_ids: strength.evidence_segment_ids.filter((id) => validSegmentIds.has(id)),
    })),
  };
}

function verdictFor(mastery: number, hasCritical: boolean): FeedbackVerdict {
  if (mastery < 40) return "incorrect";
  if (mastery < 70 || hasCritical) return "partial";
  if (mastery < 85) return "mostly_correct";

  return "correct";
}

function depthFor(mastery: number, hasCritical: boolean): FeedbackDepth {
  if (mastery < 55 || hasCritical) return "deep";
  if (mastery < 85) return "standard";

  return "concise";
}

export const feedbackAudioRule = { validate: validateAudio };
export const feedbackDeadlineRule = { isExpired };
export const feedbackEvaluationRule = { create: createEvaluation, grade: gradeRubric };
