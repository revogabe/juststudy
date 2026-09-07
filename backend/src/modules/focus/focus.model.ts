import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticationSchema } from "@/modules/authentication";
import type { FocusStatus } from "./focus.contract";

export const focus_sessions = pgTable(
  "focus_sessions",
  {
    id: uuid().defaultRandom().primaryKey(),
    randomization_id: uuid().notNull(),
    user_id: text()
      .notNull()
      .references(() => authenticationSchema.users.id, { onDelete: "cascade" }),
    duration_seconds: integer().notNull(),
    status: text().$type<FocusStatus>().default("active").notNull(),
    started_at: timestamp({ withTimezone: true }).notNull(),
    ends_at: timestamp({ withTimezone: true }).notNull(),
    last_seen_at: timestamp({ withTimezone: true }).notNull(),
    finished_at: timestamp({ withTimezone: true }),
    randomization_synced_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("focus_sessions_randomization_index").on(table.randomization_id),
    uniqueIndex("focus_sessions_active_user_index")
      .on(table.user_id)
      .where(sql`${table.status} = 'active'`),
    index("focus_sessions_active_ends_at_index")
      .on(table.ends_at)
      .where(sql`${table.status} = 'active'`),
    index("focus_sessions_active_last_seen_at_index")
      .on(table.last_seen_at)
      .where(sql`${table.status} = 'active'`),
    check("focus_sessions_duration_check", sql`${table.duration_seconds} between 60 and 14400`),
    check("focus_sessions_dates_check", sql`${table.ends_at} > ${table.started_at}`),
    check(
      "focus_sessions_status_check",
      sql`${table.status} in ('active', 'completed', 'abandoned')`,
    ),
    check(
      "focus_sessions_finished_at_check",
      sql`(${table.status} = 'active' and ${table.finished_at} is null) or (${table.status} in ('completed', 'abandoned') and ${table.finished_at} is not null)`,
    ),
  ],
);
