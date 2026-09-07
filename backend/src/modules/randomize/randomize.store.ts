import { and, desc, eq, inArray, lt, or, type SQL } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import type { KnowledgeTopicReference } from "@/modules/knowledge";
import type {
  RandomizationAttemptQuery,
  RandomizationAttemptSearchQuery,
  RandomizationAttemptUpdate,
  RandomizationStatus,
  RandomizeHistoryQuery,
  RandomizeHistoryRecordPage,
  TopicRandomizationCreate,
  TopicRandomizationRecord,
} from "./randomize.contract";
import { topic_randomizations } from "./randomize.model";

export function createRandomizeStore(database: DatabaseClient) {
  return {
    attempt: {
      async get(input: RandomizationAttemptQuery): Promise<TopicRandomizationRecord | null> {
        const [attempt] = await database
          .select()
          .from(topic_randomizations)
          .where(
            and(
              eq(topic_randomizations.id, input.id),
              eq(topic_randomizations.user_id, input.user_id),
            ),
          );

        return attempt ?? null;
      },
      search(input: RandomizationAttemptSearchQuery): Promise<TopicRandomizationRecord[]> {
        if (input.ids.length === 0) return Promise.resolve([]);

        return database
          .select()
          .from(topic_randomizations)
          .where(
            and(
              eq(topic_randomizations.user_id, input.user_id),
              inArray(topic_randomizations.id, input.ids),
            ),
          );
      },
      async update(input: RandomizationAttemptUpdate): Promise<TopicRandomizationRecord | null> {
        const [attempt] = await database
          .update(topic_randomizations)
          .set({ status: input.status, updated_at: input.updated_at })
          .where(
            and(
              eq(topic_randomizations.id, input.id),
              eq(topic_randomizations.user_id, input.user_id),
              eq(topic_randomizations.status, "pending"),
            ),
          )
          .returning();

        if (attempt) return attempt;

        const [current] = await database
          .select()
          .from(topic_randomizations)
          .where(
            and(
              eq(topic_randomizations.id, input.id),
              eq(topic_randomizations.user_id, input.user_id),
            ),
          );

        return current ?? null;
      },
    },
    blockedTopic: {
      async search(
        userId: string,
        statuses: RandomizationStatus[],
      ): Promise<KnowledgeTopicReference[]> {
        return database
          .select({
            subject_slug: topic_randomizations.subject_slug,
            topic_slug: topic_randomizations.topic_slug,
          })
          .from(topic_randomizations)
          .where(
            and(
              eq(topic_randomizations.user_id, userId),
              inArray(topic_randomizations.status, statuses),
            ),
          );
      },
    },
    randomization: {
      async create(input: TopicRandomizationCreate): Promise<TopicRandomizationRecord | null> {
        const [randomization] = await database
          .insert(topic_randomizations)
          .values(input)
          .onConflictDoNothing()
          .returning();

        return randomization ?? null;
      },
    },
    history: {
      search(input: RandomizeHistoryQuery): Promise<RandomizeHistoryRecordPage> {
        return searchHistory(database, input);
      },
    },
  };
}

async function searchHistory(
  database: DatabaseClient,
  input: RandomizeHistoryQuery,
): Promise<RandomizeHistoryRecordPage> {
  let cursorCondition: SQL | undefined;

  if (input.cursor) {
    const [cursor] = await database
      .select({
        id: topic_randomizations.id,
        created_at: topic_randomizations.created_at,
      })
      .from(topic_randomizations)
      .where(
        and(
          eq(topic_randomizations.id, input.cursor),
          eq(topic_randomizations.user_id, input.user_id),
        ),
      );

    if (!cursor) return { randomizations: [], next_cursor: null };

    cursorCondition = or(
      lt(topic_randomizations.created_at, cursor.created_at),
      and(
        eq(topic_randomizations.created_at, cursor.created_at),
        lt(topic_randomizations.id, cursor.id),
      ),
    );
  }

  const randomizations = await database
    .select()
    .from(topic_randomizations)
    .where(and(eq(topic_randomizations.user_id, input.user_id), cursorCondition))
    .orderBy(desc(topic_randomizations.created_at), desc(topic_randomizations.id))
    .limit(input.limit + 1);
  const hasNextPage = randomizations.length > input.limit;
  const page = hasNextPage ? randomizations.slice(0, input.limit) : randomizations;

  return {
    randomizations: page,
    next_cursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
  };
}

export type RandomizeStore = ReturnType<typeof createRandomizeStore>;
