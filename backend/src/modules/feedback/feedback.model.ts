import { sql } from "drizzle-orm";
import { boolean, check, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Transcript } from "@/integrations/transcription";
import { authenticationSchema } from "@/modules/authentication";
import type { KnowledgeAssessmentContext, KnowledgeLevel } from "@/modules/knowledge";
import type { FeedbackDecision, FeedbackEvaluation, FeedbackShadowMode, FeedbackStatus, FeedbackVerdict } from "./feedback.contract";

export const feedback_sessions = pgTable(
  "feedback_sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    focus_session_id: uuid().notNull(),
    randomization_id: uuid().notNull(),
    user_id: text()
      .notNull()
      .references(() => authenticationSchema.users.id, { onDelete: "cascade" }),
    subject_slug: text().notNull(),
    subject_name: text().notNull(),
    topic_slug: text().notNull(),
    topic_name: text().notNull(),
    topic_level: text().$type<KnowledgeLevel>().notNull(),
    assessment_context: jsonb().$type<KnowledgeAssessmentContext>().notNull(),
    status: text().$type<FeedbackStatus>().default("active").notNull(),
    started_at: timestamp({ withTimezone: true }).notNull(),
    recording_ends_at: timestamp({ withTimezone: true }).notNull(),
    upload_ends_at: timestamp({ withTimezone: true }).notNull(),
    last_seen_at: timestamp({ withTimezone: true }).notNull(),
    submitted_at: timestamp({ withTimezone: true }),
    completed_at: timestamp({ withTimezone: true }),
    transcript: jsonb().$type<Transcript>(),
    evaluation_id: uuid(),
    evaluation: jsonb().$type<FeedbackEvaluation>(),
    evaluation_provider: text(),
    evaluation_model: text(),
    prompt_version: text(),
    schema_version: text(),
    input_tokens: integer(),
    output_tokens: integer(),
    total_tokens: integer(),
    estimated_cost_usd: doublePrecision(),
    evaluation_latency_ms: integer(),
    score_before: integer(),
    score_after: integer(),
    score_algorithm_version: text(),
    process_attempts: integer().default(0).notNull(),
    next_attempt_at: timestamp({ withTimezone: true }),
    lease_until: timestamp({ withTimezone: true }),
    error_code: text(),
    usage_synced_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("feedback_sessions_focus_live_index")
      .on(table.focus_session_id)
      .where(sql`${table.status} in ('active', 'pending', 'completed', 'failed')`),
    uniqueIndex("feedback_sessions_active_user_index").on(table.user_id).where(sql`${table.status} = 'active'`),
    uniqueIndex("feedback_sessions_evaluation_index").on(table.evaluation_id).where(sql`${table.evaluation_id} is not null`),
    index("feedback_sessions_pending_job_index").on(table.next_attempt_at).where(sql`${table.status} = 'pending'`),
    index("feedback_sessions_history_index").on(table.user_id, table.submitted_at.desc(), table.id.desc()),
    index("feedback_sessions_usage_outbox_index")
      .on(table.completed_at)
      .where(sql`${table.status} = 'completed' and ${table.usage_synced_at} is null`),
    check("feedback_sessions_status_check", sql`${table.status} in ('active', 'pending', 'completed', 'failed', 'expired')`),
    check(
      "feedback_sessions_deadlines_check",
      sql`${table.recording_ends_at} > ${table.started_at} and ${table.upload_ends_at} > ${table.recording_ends_at}`,
    ),
    check(
      "feedback_sessions_transcript_check",
      sql`(${table.status} in ('pending', 'completed', 'failed') and ${table.transcript} is not null and ${table.submitted_at} is not null) or (${table.status} in ('active', 'expired'))`,
    ),
  ],
);

export const feedback_shadow_reviews = pgTable(
  "feedback_shadow_reviews",
  {
    id: uuid().defaultRandom().primaryKey(),
    feedback_session_id: uuid()
      .notNull()
      .references(() => feedback_sessions.id, { onDelete: "cascade" }),
    mode: text().$type<FeedbackShadowMode>().notNull(),
    status: text().$type<"completed" | "failed">().notNull(),
    provider: text(),
    model: text(),
    scorable: boolean(),
    mastery: integer(),
    verdict: text().$type<FeedbackVerdict>(),
    correction_segment_ids: jsonb().$type<string[]>().notNull(),
    confidence: doublePrecision(),
    primary_mastery: integer(),
    primary_verdict: text().$type<FeedbackVerdict>(),
    decision: jsonb().$type<FeedbackDecision>(),
    evaluation: jsonb().$type<FeedbackEvaluation>(),
    input_tokens: integer(),
    output_tokens: integer(),
    estimated_cost_usd: doublePrecision(),
    latency_ms: integer(),
    error_code: text(),
    created_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("feedback_shadow_reviews_session_mode_index").on(table.feedback_session_id, table.mode),
    index("feedback_shadow_reviews_mode_created_index").on(table.mode, table.created_at),
    check("feedback_shadow_reviews_mode_check", sql`${table.mode} in ('decision', 'llm', 'hybrid')`),
    check("feedback_shadow_reviews_status_check", sql`${table.status} in ('completed', 'failed')`),
  ],
);
