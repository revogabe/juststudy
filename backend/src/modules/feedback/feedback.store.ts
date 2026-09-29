import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, type SQL } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import { FEEDBACK_INACTIVITY_SECONDS, FEEDBACK_LEASE_SECONDS } from "./feedback.constant";
import type {
  FeedbackEvaluationWrite,
  FeedbackHistoryPage,
  FeedbackHistoryQuery,
  FeedbackSessionCreate,
  FeedbackSessionRecord,
  FeedbackShadowMode,
  FeedbackShadowReviewWrite,
} from "./feedback.contract";
import { feedback_sessions, feedback_shadow_reviews } from "./feedback.model";

export type FeedbackSessionCreateResult =
  | { result: "created" | "existing"; session: FeedbackSessionRecord }
  | { result: "active_conflict" };

export function createFeedbackStore(database: DatabaseClient) {
  return {
    session: {
      create(input: FeedbackSessionCreate): Promise<FeedbackSessionCreateResult> {
        return createSession(database, input);
      },
      get(userId: string, sessionId: string): Promise<FeedbackSessionRecord | null> {
        return getSession(database, userId, sessionId);
      },
      async heartbeat(userId: string, sessionId: string, seenAt: Date): Promise<FeedbackSessionRecord | null> {
        const [session] = await database
          .update(feedback_sessions)
          .set({ last_seen_at: seenAt, updated_at: seenAt })
          .where(
            and(
              eq(feedback_sessions.id, sessionId),
              eq(feedback_sessions.user_id, userId),
              eq(feedback_sessions.status, "active"),
              lte(feedback_sessions.last_seen_at, seenAt),
            ),
          )
          .returning();

        return session ?? getSession(database, userId, sessionId);
      },
      async expire(userId: string, sessionId: string, expiredAt: Date) {
        const [session] = await database
          .update(feedback_sessions)
          .set({ status: "expired", error_code: "FEEDBACK_SESSION_EXPIRED", updated_at: expiredAt })
          .where(and(eq(feedback_sessions.id, sessionId), eq(feedback_sessions.user_id, userId), eq(feedback_sessions.status, "active")))
          .returning();

        return session ?? getSession(database, userId, sessionId);
      },
      async submit(
        userId: string,
        sessionId: string,
        transcript: FeedbackSessionRecord["transcript"],
        submittedAt: Date,
      ): Promise<FeedbackSessionRecord | null> {
        const [session] = await database
          .update(feedback_sessions)
          .set({
            status: "pending",
            transcript,
            submitted_at: submittedAt,
            next_attempt_at: submittedAt,
            error_code: null,
            updated_at: submittedAt,
          })
          .where(and(eq(feedback_sessions.id, sessionId), eq(feedback_sessions.user_id, userId), eq(feedback_sessions.status, "active")))
          .returning();

        return session ?? getSession(database, userId, sessionId);
      },
    },
    expiration: {
      async update(now: Date): Promise<number> {
        const inactiveBefore = new Date(now.getTime() - FEEDBACK_INACTIVITY_SECONDS * 1000);
        const expired = await database
          .update(feedback_sessions)
          .set({ status: "expired", error_code: "FEEDBACK_SESSION_EXPIRED", updated_at: now })
          .where(
            and(
              eq(feedback_sessions.status, "active"),
              or(lte(feedback_sessions.upload_ends_at, now), lte(feedback_sessions.last_seen_at, inactiveBefore)),
            ),
          )
          .returning({ id: feedback_sessions.id });

        return expired.length;
      },
    },
    history: {
      search(input: FeedbackHistoryQuery): Promise<FeedbackHistoryPage> {
        return searchHistory(database, input);
      },
    },
    job: {
      claim(now: Date, limit: number): Promise<FeedbackSessionRecord[]> {
        return claimJobs(database, now, limit);
      },
      async saveEvaluation(input: FeedbackEvaluationWrite): Promise<FeedbackSessionRecord | null> {
        const [session] = await database
          .update(feedback_sessions)
          .set({
            evaluation_id: input.result.evaluation_id,
            evaluation: input.evaluation,
            evaluation_provider: input.result.provider,
            evaluation_model: input.result.model,
            prompt_version: input.result.prompt_version,
            schema_version: input.result.schema_version,
            input_tokens: input.result.input_tokens,
            output_tokens: input.result.output_tokens,
            total_tokens: input.result.total_tokens,
            estimated_cost_usd: input.result.estimated_cost_usd,
            evaluation_latency_ms: input.result.latency_ms,
            updated_at: input.updated_at,
          })
          .where(
            and(
              eq(feedback_sessions.id, input.session_id),
              eq(feedback_sessions.status, "pending"),
              isNull(feedback_sessions.evaluation_id),
            ),
          )
          .returning();

        return session ?? getSessionById(database, input.session_id);
      },
      async complete(input: {
        session_id: string;
        score_before: number | null;
        score_after: number | null;
        score_algorithm_version: string | null;
        completed_at: Date;
      }): Promise<FeedbackSessionRecord | null> {
        const [session] = await database
          .update(feedback_sessions)
          .set({
            status: "completed",
            completed_at: input.completed_at,
            score_before: input.score_before,
            score_after: input.score_after,
            score_algorithm_version: input.score_algorithm_version,
            lease_until: null,
            next_attempt_at: null,
            error_code: null,
            updated_at: input.completed_at,
          })
          .where(and(eq(feedback_sessions.id, input.session_id), eq(feedback_sessions.status, "pending")))
          .returning();

        return session ?? getSessionById(database, input.session_id);
      },
      async fail(input: {
        session_id: string;
        attempts: number;
        retry_at: Date | null;
        error_code: string;
        updated_at: Date;
      }): Promise<void> {
        await database
          .update(feedback_sessions)
          .set({
            status: input.retry_at ? "pending" : "failed",
            process_attempts: input.attempts,
            next_attempt_at: input.retry_at,
            lease_until: null,
            error_code: input.error_code,
            updated_at: input.updated_at,
          })
          .where(and(eq(feedback_sessions.id, input.session_id), eq(feedback_sessions.status, "pending")));
      },
    },
    usage: {
      search(limit: number): Promise<FeedbackSessionRecord[]> {
        return database
          .select()
          .from(feedback_sessions)
          .where(and(eq(feedback_sessions.status, "completed"), isNull(feedback_sessions.usage_synced_at)))
          .orderBy(feedback_sessions.completed_at)
          .limit(limit);
      },
      async markSynced(sessionId: string, syncedAt: Date): Promise<void> {
        await database
          .update(feedback_sessions)
          .set({ usage_synced_at: syncedAt })
          .where(and(eq(feedback_sessions.id, sessionId), isNull(feedback_sessions.usage_synced_at)));
      },
    },
    shadow: {
      search(input: { mode: FeedbackShadowMode; completed_after: Date; limit: number }): Promise<FeedbackSessionRecord[]> {
        return database
          .select()
          .from(feedback_sessions)
          .where(
            and(
              eq(feedback_sessions.status, "completed"),
              isNotNull(feedback_sessions.evaluation),
              gte(feedback_sessions.completed_at, input.completed_after),
              notExists(
                database
                  .select({ id: feedback_shadow_reviews.id })
                  .from(feedback_shadow_reviews)
                  .where(
                    and(
                      eq(feedback_shadow_reviews.feedback_session_id, feedback_sessions.id),
                      eq(feedback_shadow_reviews.mode, input.mode),
                    ),
                  ),
              ),
            ),
          )
          .orderBy(feedback_sessions.completed_at)
          .limit(input.limit);
      },
      async create(input: FeedbackShadowReviewWrite): Promise<void> {
        await database.insert(feedback_shadow_reviews).values(input).onConflictDoNothing();
      },
    },
  };
}

async function createSession(database: DatabaseClient, input: FeedbackSessionCreate): Promise<FeedbackSessionCreateResult> {
  const [created] = await database
    .insert(feedback_sessions)
    .values({
      focus_session_id: input.focus_session_id,
      randomization_id: input.randomization_id,
      user_id: input.user_id,
      subject_slug: input.context.subject.slug,
      subject_name: input.context.subject.name,
      topic_slug: input.context.topic.slug,
      topic_name: input.context.topic.name,
      topic_level: input.context.topic.level,
      assessment_context: input.context,
      status: "active",
      started_at: input.started_at,
      recording_ends_at: input.recording_ends_at,
      upload_ends_at: input.upload_ends_at,
      last_seen_at: input.started_at,
      updated_at: input.started_at,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return { result: "created", session: created };

  const [existing] = await database
    .select()
    .from(feedback_sessions)
    .where(
      and(
        eq(feedback_sessions.focus_session_id, input.focus_session_id),
        eq(feedback_sessions.user_id, input.user_id),
        inArray(feedback_sessions.status, ["active", "pending", "completed", "failed"]),
      ),
    );

  if (existing) return { result: "existing", session: existing };

  return { result: "active_conflict" };
}

async function claimJobs(database: DatabaseClient, now: Date, limit: number): Promise<FeedbackSessionRecord[]> {
  return database.transaction(async (transaction) => {
    const jobs = await transaction
      .select()
      .from(feedback_sessions)
      .where(
        and(
          eq(feedback_sessions.status, "pending"),
          lte(feedback_sessions.next_attempt_at, now),
          or(isNull(feedback_sessions.lease_until), lte(feedback_sessions.lease_until, now)),
        ),
      )
      .orderBy(feedback_sessions.next_attempt_at)
      .limit(limit)
      .for("update", { skipLocked: true });

    if (jobs.length === 0) return [];

    const leaseUntil = new Date(now.getTime() + FEEDBACK_LEASE_SECONDS * 1000);
    const ids = jobs.map((job) => job.id);

    return transaction.update(feedback_sessions).set({ lease_until: leaseUntil }).where(inArray(feedback_sessions.id, ids)).returning();
  });
}

async function searchHistory(database: DatabaseClient, input: FeedbackHistoryQuery): Promise<FeedbackHistoryPage> {
  let cursorCondition: SQL | undefined;

  if (input.cursor) {
    const [cursor] = await database
      .select({ id: feedback_sessions.id, submitted_at: feedback_sessions.submitted_at })
      .from(feedback_sessions)
      .where(and(eq(feedback_sessions.id, input.cursor), eq(feedback_sessions.user_id, input.user_id)));

    if (!cursor?.submitted_at) return { feedback: [], next_cursor: null };

    cursorCondition = or(
      lt(feedback_sessions.submitted_at, cursor.submitted_at),
      and(eq(feedback_sessions.submitted_at, cursor.submitted_at), lt(feedback_sessions.id, cursor.id)),
    );
  }

  const sessions = await database
    .select()
    .from(feedback_sessions)
    .where(
      and(
        eq(feedback_sessions.user_id, input.user_id),
        inArray(feedback_sessions.status, ["pending", "completed", "failed"]),
        cursorCondition,
      ),
    )
    .orderBy(desc(feedback_sessions.submitted_at), desc(feedback_sessions.id))
    .limit(input.limit + 1);
  const hasNextPage = sessions.length > input.limit;
  const page = hasNextPage ? sessions.slice(0, input.limit) : sessions;

  return {
    feedback: page,
    next_cursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
  };
}

async function getSession(database: DatabaseClient, userId: string, sessionId: string): Promise<FeedbackSessionRecord | null> {
  const [session] = await database
    .select()
    .from(feedback_sessions)
    .where(and(eq(feedback_sessions.id, sessionId), eq(feedback_sessions.user_id, userId)));

  return session ?? null;
}

async function getSessionById(database: DatabaseClient, sessionId: string): Promise<FeedbackSessionRecord | null> {
  const [session] = await database.select().from(feedback_sessions).where(eq(feedback_sessions.id, sessionId));

  return session ?? null;
}

export type FeedbackStore = ReturnType<typeof createFeedbackStore>;
