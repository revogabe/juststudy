import { and, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import { SCORE_ALGORITHM_VERSION } from "./score.constant";
import type { ScoreEvaluation, ScoreEventRecord, ScoreUpdate, SubjectScoreRecord } from "./score.contract";
import { score_events, subject_scores } from "./score.model";
import { masteryBand, subjectScoreRule } from "./score.rule";

export function createScoreStore(database: DatabaseClient) {
  return {
    evaluation: {
      create(input: ScoreEvaluation): Promise<ScoreUpdate> {
        return database.transaction(async (transaction) => {
          await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.user_id}:${input.subject_slug}`}, 0))`);

          const [existing] = await transaction.select().from(score_events).where(eq(score_events.evaluation_id, input.evaluation_id));

          if (existing) {
            const [snapshot] = await transaction
              .select()
              .from(subject_scores)
              .where(and(eq(subject_scores.user_id, existing.user_id), eq(subject_scores.subject_slug, existing.subject_slug)));

            if (!snapshot) throw new Error("An existing score event has no subject snapshot.");

            return {
              before: existing.score_before,
              after: existing.score_after,
              delta: existing.score_after - existing.score_before,
              algorithm_version: existing.algorithm_version,
              snapshot,
            };
          }

          const [previous] = await transaction
            .select()
            .from(subject_scores)
            .where(and(eq(subject_scores.user_id, input.user_id), eq(subject_scores.subject_slug, input.subject_slug)));

          const before = previous?.score ?? 0;
          const [created] = await transaction
            .insert(score_events)
            .values({
              ...input,
              mastery_band: masteryBand(input.mastery),
              algorithm_version: SCORE_ALGORITHM_VERSION,
              score_before: before,
              score_after: before,
            })
            .returning();

          if (!created) throw new Error("The score event could not be created.");

          const events = await transaction
            .select()
            .from(score_events)
            .where(and(eq(score_events.user_id, input.user_id), eq(score_events.subject_slug, input.subject_slug)));
          const snapshot = subjectScoreRule.calculate(input.user_id, input.subject_slug, events as ScoreEventRecord[]);

          await transaction.update(score_events).set({ score_after: snapshot.score }).where(eq(score_events.id, created.id));

          await transaction
            .insert(subject_scores)
            .values(snapshot)
            .onConflictDoUpdate({
              target: [subject_scores.user_id, subject_scores.subject_slug],
              set: snapshot,
            });

          return {
            before,
            after: snapshot.score,
            delta: snapshot.score - before,
            algorithm_version: SCORE_ALGORITHM_VERSION,
            snapshot,
          };
        });
      },
    },
    subject: {
      get(userId: string): Promise<SubjectScoreRecord[]> {
        return database.select().from(subject_scores).where(eq(subject_scores.user_id, userId));
      },
    },
  };
}

export type ScoreStore = ReturnType<typeof createScoreStore>;
