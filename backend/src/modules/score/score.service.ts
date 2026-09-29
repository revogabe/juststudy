import type { KnowledgeService } from "@/modules/knowledge";
import { SCORE_ALGORITHM_VERSION } from "./score.constant";
import type { ScoreEvaluation, ScoreUpdate, SubjectScore } from "./score.contract";
import type { ScoreStore } from "./score.store";

type ScoreServiceInput = {
  store: ScoreStore;
  knowledge: Pick<KnowledgeService, "subject">;
};

export function createScoreService(input: ScoreServiceInput) {
  return {
    evaluation: {
      create(evaluation: ScoreEvaluation): Promise<ScoreUpdate> {
        return input.store.evaluation.create(evaluation);
      },
    },
    subject: {
      async get(userId: string): Promise<SubjectScore[]> {
        const [subjects, scores] = await Promise.all([input.knowledge.subject.get(), input.store.subject.get(userId)]);
        const scoresBySubject = new Map(scores.map((score) => [score.subject_slug, score]));

        return subjects.map((subject) => {
          const stored = scoresBySubject.get(subject.slug);

          if (stored) {
            const { user_id: _, ...score } = stored;

            return { ...score, subject_name: subject.name };
          }

          return {
            subject_slug: subject.slug,
            subject_name: subject.name,
            score: 0,
            certified_level: null,
            evaluations_count: 0,
            distinct_topics_count: 0,
            provisional: true,
            algorithm_version: SCORE_ALGORITHM_VERSION,
            updated_at: new Date(0),
          };
        });
      },
    },
  };
}

export type ScoreService = ReturnType<typeof createScoreService>;
