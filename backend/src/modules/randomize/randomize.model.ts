import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticationSchema } from "@/modules/authentication";
import { knowledgeSchema } from "@/modules/knowledge";
import type { RandomizationStatus } from "./randomize.contract";

export const topic_randomizations = pgTable(
  "topic_randomizations",
  {
    id: uuid().defaultRandom().primaryKey(),
    user_id: text()
      .notNull()
      .references(() => authenticationSchema.users.id, { onDelete: "cascade" }),
    subject_slug: text().notNull(),
    topic_slug: text().notNull(),
    status: text().$type<RandomizationStatus>().default("pending").notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.subject_slug, table.topic_slug],
      foreignColumns: [
        knowledgeSchema.knowledge_topics.subject_slug,
        knowledgeSchema.knowledge_topics.slug,
      ],
      name: "topic_randomizations_topic_fk",
    }).onDelete("restrict"),
    uniqueIndex("topic_randomizations_active_topic_index")
      .on(table.user_id, table.subject_slug, table.topic_slug)
      .where(sql`${table.status} in ('pending', 'completed')`),
    index("topic_randomizations_user_timeline_index").on(
      table.user_id,
      table.created_at.desc(),
      table.id.desc(),
    ),
    index("topic_randomizations_user_subject_status_index").on(
      table.user_id,
      table.subject_slug,
      table.status,
    ),
    check(
      "topic_randomizations_status_check",
      sql`${table.status} in ('pending', 'abandoned', 'completed')`,
    ),
  ],
);
