import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticationSchema } from "@/modules/authentication";
import { knowledgeSchema } from "@/modules/knowledge";
import type { KnowledgeLevel } from "@/modules/knowledge/knowledge.contract";

export const score_events = pgTable(
  "score_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    evaluation_id: uuid().notNull(),
    feedback_session_id: uuid().notNull(),
    user_id: text()
      .notNull()
      .references(() => authenticationSchema.users.id, { onDelete: "cascade" }),
    subject_slug: text().notNull(),
    topic_slug: text().notNull(),
    topic_level: text().$type<KnowledgeLevel>().notNull(),
    mastery: integer().notNull(),
    mastery_band: integer().notNull(),
    factual_accuracy: integer().notNull(),
    has_critical_misconception: boolean().notNull(),
    occurred_at: timestamp({ withTimezone: true }).notNull(),
    algorithm_version: text().notNull(),
    score_before: integer().notNull(),
    score_after: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("score_events_evaluation_index").on(table.evaluation_id),
    uniqueIndex("score_events_feedback_session_index").on(table.feedback_session_id),
    index("score_events_user_subject_timeline_index").on(table.user_id, table.subject_slug, table.occurred_at, table.id),
    foreignKey({
      columns: [table.subject_slug, table.topic_slug],
      foreignColumns: [knowledgeSchema.knowledge_topics.subject_slug, knowledgeSchema.knowledge_topics.slug],
      name: "score_events_topic_fk",
    }).onDelete("restrict"),
    check("score_events_mastery_check", sql`${table.mastery} between 0 and 100`),
    check("score_events_mastery_band_check", sql`${table.mastery_band} between 0 and 4`),
    check("score_events_accuracy_check", sql`${table.factual_accuracy} between 0 and 4`),
    check("score_events_score_before_check", sql`${table.score_before} between 0 and 1000`),
    check("score_events_score_after_check", sql`${table.score_after} between 0 and 1000`),
  ],
);

export const subject_scores = pgTable(
  "subject_scores",
  {
    user_id: text()
      .notNull()
      .references(() => authenticationSchema.users.id, { onDelete: "cascade" }),
    subject_slug: text()
      .notNull()
      .references(() => knowledgeSchema.knowledge_subjects.slug, { onDelete: "restrict" }),
    score: integer().notNull(),
    certified_level: text().$type<KnowledgeLevel>(),
    evaluations_count: integer().notNull(),
    distinct_topics_count: integer().notNull(),
    provisional: boolean().notNull(),
    algorithm_version: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.subject_slug] }),
    index("subject_scores_user_index").on(table.user_id),
    check("subject_scores_score_check", sql`${table.score} between 0 and 1000`),
  ],
);
