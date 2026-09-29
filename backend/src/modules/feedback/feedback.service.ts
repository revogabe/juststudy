import { AudioUnusableError, type Transcription, TranscriptionUnavailableError } from "@/integrations/transcription";
import type { BillingService } from "@/modules/billing";
import type { FocusService } from "@/modules/focus";
import type { KnowledgeService } from "@/modules/knowledge";
import type { RandomizeService } from "@/modules/randomize";
import type { ScoreService } from "@/modules/score";
import {
  FEEDBACK_MAX_AUDIO_SECONDS,
  FEEDBACK_MAX_PROCESS_ATTEMPTS,
  FEEDBACK_MIN_AUDIO_SECONDS,
  FEEDBACK_RECORDING_SECONDS,
  FEEDBACK_RETRY_SECONDS,
  FEEDBACK_SHADOW_BATCH_SIZE,
  FEEDBACK_SHADOW_LOOKBACK_HOURS,
  FEEDBACK_UPLOAD_GRACE_SECONDS,
} from "./feedback.constant";
import type {
  FeedbackAudioSubmit,
  FeedbackHistoryPage,
  FeedbackHistoryQuery,
  FeedbackReview,
  FeedbackReviewInput,
  FeedbackSession,
  FeedbackSessionCommand,
  FeedbackSessionRecord,
  FeedbackSessionStart,
  FeedbackShadowReviewer,
  FeedbackShadowReviewWrite,
} from "./feedback.contract";
import { feedbackError } from "./feedback.error";
import { feedbackAudioRule, feedbackDeadlineRule, feedbackEvaluationRule } from "./feedback.rule";
import type { FeedbackStore } from "./feedback.store";

type FeedbackServiceInput = {
  store: FeedbackStore;
  transcription: Transcription;
  review: FeedbackReview;
  billing: Pick<BillingService, "entitlement" | "usage">;
  focus: Pick<FocusService, "session">;
  knowledge: { assessment: Pick<KnowledgeService["assessment"], "get"> };
  randomize: Pick<RandomizeService, "attempt">;
  score: Pick<ScoreService, "evaluation">;
  shadow?: FeedbackShadowReviewer | null;
  now?: () => Date;
};

export function createFeedbackService(input: FeedbackServiceInput) {
  const now = input.now ?? (() => new Date());

  async function requireSubscription(userId: string): Promise<void> {
    const entitlement = await input.billing.entitlement.get(userId);

    if (!entitlement.active_student) throw feedbackError.subscriptionRequired();
  }

  return {
    session: {
      async create(command: FeedbackSessionStart): Promise<FeedbackSession> {
        await requireSubscription(command.user_id);
        await input.store.expiration.update(now());

        const focus = await input.focus.session.get({
          session_id: command.focus_session_id,
          user_id: command.user_id,
        });

        if (focus.status !== "completed") throw feedbackError.focusUnavailable();

        const [randomization] = await input.randomize.attempt.search({
          ids: [focus.randomization_id],
          user_id: command.user_id,
        });

        if (randomization?.status !== "completed") throw feedbackError.focusUnavailable();

        const context = await input.knowledge.assessment.get({
          subject_slug: randomization.subject.slug,
          topic_slug: randomization.topic.slug,
        });

        if (!context) throw feedbackError.contextUnavailable();

        const startedAt = now();
        const recordingEndsAt = new Date(startedAt.getTime() + FEEDBACK_RECORDING_SECONDS * 1000);
        const result = await input.store.session.create({
          focus_session_id: focus.id,
          randomization_id: focus.randomization_id,
          user_id: command.user_id,
          context,
          started_at: startedAt,
          recording_ends_at: recordingEndsAt,
          upload_ends_at: new Date(recordingEndsAt.getTime() + FEEDBACK_UPLOAD_GRACE_SECONDS * 1000),
        });

        if (result.result === "active_conflict") throw feedbackError.activeSession();

        return toFeedbackSession(result.session);
      },
      async get(command: FeedbackSessionCommand): Promise<FeedbackSession> {
        const session = await getSession(input.store, command);

        return toFeedbackSession(await reconcileSession(input.store, session, now()));
      },
      async heartbeat(command: FeedbackSessionCommand): Promise<FeedbackSession> {
        const session = await getSession(input.store, command);
        const checked = await reconcileSession(input.store, session, now());

        if (checked.status === "expired") throw feedbackError.expired();
        if (checked.status !== "active") return toFeedbackSession(checked);

        const updated = await input.store.session.heartbeat(command.user_id, command.session_id, now());

        if (!updated) throw feedbackError.sessionNotFound();

        return toFeedbackSession(updated);
      },
      async submit(command: FeedbackAudioSubmit): Promise<FeedbackSession> {
        await requireSubscription(command.user_id);
        feedbackAudioRule.validate(command);

        const current = await getSession(input.store, command);
        const session = await reconcileSession(input.store, current, now());

        if (session.status === "expired") throw feedbackError.expired();
        if (session.status !== "active") return toFeedbackSession(session);
        if (now() > session.upload_ends_at) throw feedbackError.expired();

        try {
          const transcript = await input.transcription.transcript.create({
            bytes: command.bytes,
            filename: command.filename,
            media_type: command.media_type,
          });

          if (
            transcript.duration_seconds < FEEDBACK_MIN_AUDIO_SECONDS ||
            transcript.duration_seconds > FEEDBACK_MAX_AUDIO_SECONDS ||
            !transcript.text.trim()
          )
            throw feedbackError.audioInvalid("The audio must contain between 3 and 900 seconds of understandable speech.");

          const submitted = await input.store.session.submit(command.user_id, command.session_id, transcript, now());

          if (!submitted) throw feedbackError.sessionNotFound();
          if (submitted.status === "expired") throw feedbackError.expired();

          return toFeedbackSession(submitted);
        } catch (error) {
          if (error instanceof AudioUnusableError) throw feedbackError.audioInvalid("The audio does not contain understandable speech.");
          if (error instanceof TranscriptionUnavailableError) throw feedbackError.transcriptionUnavailable();

          throw error;
        }
      },
    },
    history: {
      async search(query: FeedbackHistoryQuery): Promise<{
        feedback: FeedbackSession[];
        next_cursor: string | null;
      }> {
        const page: FeedbackHistoryPage = await input.store.history.search(query);

        return {
          feedback: page.feedback.map(toFeedbackSession),
          next_cursor: page.next_cursor,
        };
      },
    },
    job: {
      async process(): Promise<number> {
        await input.store.expiration.update(now());
        const jobs = await input.store.job.claim(now(), 1);

        for (const job of jobs) await processJob(input, job, now);

        await synchronizeUsage(input, now);
        await reviewShadow(input, now);

        return jobs.length;
      },
    },
  };
}

async function processJob(input: FeedbackServiceInput, claimed: FeedbackSessionRecord, now: () => Date): Promise<void> {
  try {
    let session = claimed;

    if (!session.transcript) throw new Error("A pending feedback session has no transcript.");

    if (!session.evaluation || !session.evaluation_id) {
      const result = await input.review.explanation.create({
        feedback_session_id: session.id,
        context: session.assessment_context,
        transcript: session.transcript,
      });
      const evaluation = feedbackEvaluationRule.create(result.evaluation, session.transcript);
      const saved = await input.store.job.saveEvaluation({
        session_id: session.id,
        result,
        evaluation,
        updated_at: now(),
      });

      if (!saved) throw new Error("Feedback evaluation could not be persisted.");

      session = saved;
    }

    let scoreBefore: number | null = null;
    let scoreAfter: number | null = null;
    let algorithmVersion: string | null = null;

    if (session.evaluation?.scorable && session.evaluation.mastery !== null && session.evaluation_id) {
      const update = await input.score.evaluation.create({
        evaluation_id: session.evaluation_id,
        feedback_session_id: session.id,
        user_id: session.user_id,
        subject_slug: session.subject_slug,
        topic_slug: session.topic_slug,
        topic_level: session.topic_level,
        mastery: session.evaluation.mastery,
        factual_accuracy: session.evaluation.rubric.factual_accuracy.score,
        has_critical_misconception: session.evaluation.corrections.some((correction) => correction.severity === "critical"),
        occurred_at: session.submitted_at ?? now(),
      });

      scoreBefore = update.before;
      scoreAfter = update.after;
      algorithmVersion = update.algorithm_version;
    }

    await input.store.job.complete({
      session_id: session.id,
      score_before: scoreBefore,
      score_after: scoreAfter,
      score_algorithm_version: algorithmVersion,
      completed_at: now(),
    });
  } catch {
    const attempts = claimed.process_attempts + 1;
    const retrySeconds = FEEDBACK_RETRY_SECONDS[attempts - 1];
    const retryAt = attempts < FEEDBACK_MAX_PROCESS_ATTEMPTS && retrySeconds ? new Date(now().getTime() + retrySeconds * 1000) : null;

    await input.store.job.fail({
      session_id: claimed.id,
      attempts,
      retry_at: retryAt,
      error_code: "FEEDBACK_EVALUATION_FAILED",
      updated_at: now(),
    });
  }
}

async function synchronizeUsage(input: FeedbackServiceInput, now: () => Date): Promise<void> {
  const sessions = await input.store.usage.search(10);

  for (const session of sessions) {
    if (!session.evaluation_id || !session.total_tokens || !session.evaluation_model) {
      await input.store.usage.markSynced(session.id, now());
      continue;
    }

    try {
      await input.billing.usage.create({
        external_id: `feedback-evaluation:${session.evaluation_id}`,
        user_id: session.user_id,
        total_tokens: session.total_tokens,
        input_tokens: session.input_tokens ?? 0,
        output_tokens: session.output_tokens ?? 0,
        model: session.evaluation_model,
      });
      await input.store.usage.markSynced(session.id, now());
    } catch {
      // The outbox stays pending and will be retried by the next worker cycle.
    }
  }
}

async function reviewShadow(input: FeedbackServiceInput, now: () => Date): Promise<void> {
  const shadow = input.shadow;
  if (!shadow) return;

  const sessions = await input.store.shadow.search({
    mode: shadow.mode,
    completed_after: new Date(now().getTime() - FEEDBACK_SHADOW_LOOKBACK_HOURS * 3_600_000),
    limit: FEEDBACK_SHADOW_BATCH_SIZE,
  });

  for (const session of sessions) {
    if (!session.transcript) continue;

    const base = {
      feedback_session_id: session.id,
      mode: shadow.mode,
      primary_mastery: session.evaluation?.mastery ?? null,
      primary_verdict: session.evaluation?.verdict ?? null,
    };
    const reviewInput = { feedback_session_id: session.id, context: session.assessment_context, transcript: session.transcript };

    try {
      const review = await createShadowReview(shadow, reviewInput);

      await input.store.shadow.create({ ...base, ...review, status: "completed", error_code: null, created_at: now() });
    } catch (error) {
      console.error(`Feedback shadow review failed for ${session.id}.`, error);
      await input.store.shadow.create({
        ...base,
        status: "failed",
        provider: null,
        model: null,
        scorable: null,
        mastery: null,
        verdict: null,
        correction_segment_ids: [],
        confidence: null,
        decision: null,
        evaluation: null,
        input_tokens: null,
        output_tokens: null,
        estimated_cost_usd: null,
        latency_ms: null,
        error_code: "FEEDBACK_SHADOW_REVIEW_FAILED",
        created_at: now(),
      });
    }
  }
}

async function createShadowReview(
  shadow: FeedbackShadowReviewer,
  reviewInput: FeedbackReviewInput,
): Promise<
  Omit<
    FeedbackShadowReviewWrite,
    "feedback_session_id" | "mode" | "status" | "primary_mastery" | "primary_verdict" | "error_code" | "created_at"
  >
> {
  if (shadow.mode === "decision") {
    const result = await shadow.review.explanation.create(reviewInput);

    return {
      provider: result.provider,
      model: result.model,
      scorable: result.decision.scorable,
      mastery: result.decision.mastery,
      verdict: result.decision.verdict,
      correction_segment_ids: result.decision.correction_segment_ids,
      confidence: result.decision.confidence,
      decision: result.decision,
      evaluation: null,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      estimated_cost_usd: result.estimated_cost_usd,
      latency_ms: result.latency_ms,
    };
  }

  const result = await shadow.review.explanation.create(reviewInput);
  const evaluation = feedbackEvaluationRule.create(result.evaluation, reviewInput.transcript);

  return {
    provider: result.provider,
    model: result.model,
    scorable: evaluation.scorable,
    mastery: evaluation.mastery,
    verdict: evaluation.verdict,
    correction_segment_ids: evaluation.corrections.map((correction) => correction.segment_id),
    confidence: null,
    decision: null,
    evaluation,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    estimated_cost_usd: result.estimated_cost_usd,
    latency_ms: result.latency_ms,
  };
}

async function getSession(store: FeedbackStore, command: FeedbackSessionCommand): Promise<FeedbackSessionRecord> {
  const session = await store.session.get(command.user_id, command.session_id);

  if (!session) throw feedbackError.sessionNotFound();

  return session;
}

async function reconcileSession(store: FeedbackStore, session: FeedbackSessionRecord, checkedAt: Date): Promise<FeedbackSessionRecord> {
  if (!feedbackDeadlineRule.isExpired(session, checkedAt)) return session;

  const expired = await store.session.expire(session.user_id, session.id, checkedAt);

  if (!expired) throw feedbackError.sessionNotFound();

  return expired;
}

function toFeedbackSession(session: FeedbackSessionRecord): FeedbackSession {
  const {
    assessment_context: _,
    lease_until: __,
    next_attempt_at: ___,
    process_attempts: ____,
    usage_synced_at: _____,
    user_id: ______,
    ...feedback
  } = session;

  return feedback;
}

export type FeedbackService = ReturnType<typeof createFeedbackService>;
