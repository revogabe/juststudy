import { and, desc, eq, inArray, isNull, lt, lte, or, type SQL } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import { FOCUS_INACTIVITY_TIMEOUT_SECONDS } from "./focus.constant";
import type {
  FocusHistoryQuery,
  FocusHistoryRecordPage,
  FocusSessionCreate,
  FocusSessionCreateResult,
  FocusSessionFinish,
  FocusSessionRecord,
  FocusTerminalStatus,
} from "./focus.contract";
import { focus_sessions } from "./focus.model";

export function createFocusStore(database: DatabaseClient) {
  return {
    session: {
      create(input: FocusSessionCreate): Promise<FocusSessionCreateResult> {
        return createSession(database, input);
      },
      async get(userId: string, sessionId: string): Promise<FocusSessionRecord | null> {
        const [session] = await database
          .select()
          .from(focus_sessions)
          .where(and(eq(focus_sessions.id, sessionId), eq(focus_sessions.user_id, userId)));

        return session ?? null;
      },
      async getActive(userId: string): Promise<FocusSessionRecord | null> {
        const [session] = await database
          .select()
          .from(focus_sessions)
          .where(and(eq(focus_sessions.user_id, userId), eq(focus_sessions.status, "active")));

        return session ?? null;
      },
      async heartbeat(
        userId: string,
        sessionId: string,
        seenAt: Date,
      ): Promise<FocusSessionRecord | null> {
        const [session] = await database
          .update(focus_sessions)
          .set({ last_seen_at: seenAt, updated_at: seenAt })
          .where(
            and(
              eq(focus_sessions.id, sessionId),
              eq(focus_sessions.user_id, userId),
              eq(focus_sessions.status, "active"),
              lte(focus_sessions.last_seen_at, seenAt),
            ),
          )
          .returning();

        if (session) return session;

        return getSession(database, userId, sessionId);
      },
      async finish(input: FocusSessionFinish): Promise<FocusSessionRecord | null> {
        const [session] = await database
          .update(focus_sessions)
          .set({
            status: input.status,
            finished_at: input.finished_at,
            randomization_synced_at: null,
            updated_at: input.finished_at,
          })
          .where(
            and(
              eq(focus_sessions.id, input.session_id),
              eq(focus_sessions.user_id, input.user_id),
              eq(focus_sessions.status, "active"),
              input.expected_updated_at
                ? eq(focus_sessions.updated_at, input.expected_updated_at)
                : undefined,
            ),
          )
          .returning();

        if (session) return session;

        return getSession(database, input.user_id, input.session_id);
      },
      async markSynced(
        userId: string,
        sessionId: string,
        status: FocusTerminalStatus,
        syncedAt: Date,
      ): Promise<FocusSessionRecord | null> {
        const [session] = await database
          .update(focus_sessions)
          .set({ randomization_synced_at: syncedAt })
          .where(
            and(
              eq(focus_sessions.id, sessionId),
              eq(focus_sessions.user_id, userId),
              eq(focus_sessions.status, status),
              isNull(focus_sessions.randomization_synced_at),
            ),
          )
          .returning();

        if (session) return session;

        return getSession(database, userId, sessionId);
      },
    },
    history: {
      search(input: FocusHistoryQuery): Promise<FocusHistoryRecordPage> {
        return searchHistory(database, input);
      },
    },
    dueSession: {
      search(now: Date): Promise<FocusSessionRecord[]> {
        const inactiveBefore = new Date(now.getTime() - FOCUS_INACTIVITY_TIMEOUT_SECONDS * 1000);

        return database
          .select()
          .from(focus_sessions)
          .where(
            and(
              eq(focus_sessions.status, "active"),
              or(
                lte(focus_sessions.ends_at, now),
                lte(focus_sessions.last_seen_at, inactiveBefore),
              ),
            ),
          );
      },
    },
    unsyncedSession: {
      search(): Promise<FocusSessionRecord[]> {
        return database
          .select()
          .from(focus_sessions)
          .where(
            and(
              inArray(focus_sessions.status, ["completed", "abandoned"]),
              isNull(focus_sessions.randomization_synced_at),
            ),
          );
      },
    },
  };
}

async function searchHistory(
  database: DatabaseClient,
  input: FocusHistoryQuery,
): Promise<FocusHistoryRecordPage> {
  let cursorCondition: SQL | undefined;

  if (input.cursor) {
    const [cursor] = await database
      .select({ id: focus_sessions.id, started_at: focus_sessions.started_at })
      .from(focus_sessions)
      .where(and(eq(focus_sessions.id, input.cursor), eq(focus_sessions.user_id, input.user_id)));

    if (!cursor) return { sessions: [], next_cursor: null };

    cursorCondition = or(
      lt(focus_sessions.started_at, cursor.started_at),
      and(eq(focus_sessions.started_at, cursor.started_at), lt(focus_sessions.id, cursor.id)),
    );
  }

  const sessions = await database
    .select()
    .from(focus_sessions)
    .where(and(eq(focus_sessions.user_id, input.user_id), cursorCondition))
    .orderBy(desc(focus_sessions.started_at), desc(focus_sessions.id))
    .limit(input.limit + 1);
  const hasNextPage = sessions.length > input.limit;
  const page = hasNextPage ? sessions.slice(0, input.limit) : sessions;

  return {
    sessions: page,
    next_cursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
  };
}

async function createSession(
  database: DatabaseClient,
  input: FocusSessionCreate,
): Promise<FocusSessionCreateResult> {
  const [session] = await database
    .insert(focus_sessions)
    .values({
      ...input,
      status: "active",
      last_seen_at: input.started_at,
      finished_at: null,
      randomization_synced_at: null,
      updated_at: input.started_at,
    })
    .onConflictDoNothing()
    .returning();

  if (session) return { result: "created", session };

  const [existing] = await database
    .select()
    .from(focus_sessions)
    .where(
      and(
        eq(focus_sessions.randomization_id, input.randomization_id),
        eq(focus_sessions.user_id, input.user_id),
      ),
    );

  if (existing) {
    if (existing.status === "active" && existing.duration_seconds === input.duration_seconds)
      return { result: "existing", session: existing };

    return {
      result: existing.status === "active" ? "active_conflict" : "randomization_unavailable",
    };
  }

  return { result: "active_conflict" };
}

async function getSession(
  database: DatabaseClient,
  userId: string,
  sessionId: string,
): Promise<FocusSessionRecord | null> {
  const [session] = await database
    .select()
    .from(focus_sessions)
    .where(and(eq(focus_sessions.id, sessionId), eq(focus_sessions.user_id, userId)));

  return session ?? null;
}

export type FocusStore = ReturnType<typeof createFocusStore>;
