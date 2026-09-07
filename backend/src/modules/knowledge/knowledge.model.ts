import { relations, sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, uniqueIndex } from "drizzle-orm/pg-core";
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
    check(
      "knowledge_topics_level_check",
      sql`${table.level} in ('beginner', 'intermediate', 'advanced', 'specialist')`,
    ),
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
