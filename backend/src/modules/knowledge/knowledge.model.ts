import { relations, sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { KnowledgeLevel } from "./knowledge.contract";

export const knowledge_subjects = pgTable("knowledge_subjects", {
  slug: text().primaryKey(),
  name: text().notNull().unique(),
});

export const knowledge_topics = pgTable(
  "knowledge_topics",
  {
    subject_slug: text()
      .notNull()
      .references(() => knowledge_subjects.slug, { onDelete: "restrict" }),
    slug: text().notNull(),
    name: text().notNull(),
    level: text().$type<KnowledgeLevel>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subject_slug, table.slug] }),
    uniqueIndex("knowledge_topics_subject_name_index").on(table.subject_slug, table.name),
    index("knowledge_topics_subject_level_index").on(table.subject_slug, table.level),
    check("knowledge_topics_level_check", sql`${table.level} in ('beginner', 'intermediate', 'advanced', 'specialist')`),
  ],
);

export const knowledge_topic_assessments = pgTable(
  "knowledge_topic_assessments",
  {
    subject_slug: text().notNull(),
    topic_slug: text().notNull(),
    reference_summary: text().notNull(),
    key_concepts: jsonb().$type<string[]>().notNull(),
    common_misconceptions: jsonb().$type<string[]>().notNull(),
    version: text().notNull(),
    provider: text().notNull(),
    model: text().notNull(),
    prompt_version: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.subject_slug, table.topic_slug] }),
    foreignKey({
      columns: [table.subject_slug, table.topic_slug],
      foreignColumns: [knowledge_topics.subject_slug, knowledge_topics.slug],
      name: "knowledge_topic_assessments_topic_fk",
    }).onDelete("cascade"),
  ],
);

export const knowledge_subjects_relations = relations(knowledge_subjects, ({ many }) => ({
  topics: many(knowledge_topics),
}));

export const knowledge_topics_relations = relations(knowledge_topics, ({ one }) => ({
  subject: one(knowledge_subjects, {
    fields: [knowledge_topics.subject_slug],
    references: [knowledge_subjects.slug],
  }),
}));
