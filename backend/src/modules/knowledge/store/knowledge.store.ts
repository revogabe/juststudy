import { asc, count, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import type { KnowledgeSubjectSummary } from "../knowledge.contract";
import { knowledge_subjects, knowledge_topics } from "../knowledge.model";
import { createKnowledgeCatalogStore } from "./knowledge-catalog.store";

export function createKnowledgeStore(database: DatabaseClient) {
  return {
    subject: {
      async get(): Promise<KnowledgeSubjectSummary[]> {
        const subjects = await database
          .select({
            slug: knowledge_subjects.slug,
            name: knowledge_subjects.name,
            topic_count: count(knowledge_topics.slug),
            beginner_count:
              sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'beginner')`.mapWith(
                Number,
              ),
            intermediate_count:
              sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'intermediate')`.mapWith(
                Number,
              ),
            advanced_count:
              sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'advanced')`.mapWith(
                Number,
              ),
            specialist_count:
              sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'specialist')`.mapWith(
                Number,
              ),
          })
          .from(knowledge_subjects)
          .leftJoin(knowledge_topics, eq(knowledge_topics.subject_slug, knowledge_subjects.slug))
          .groupBy(knowledge_subjects.slug, knowledge_subjects.name)
          .orderBy(asc(knowledge_subjects.name));

        return subjects.map((subject) => ({
          slug: subject.slug,
          name: subject.name,
          topic_count: subject.topic_count,
          level_counts: {
            beginner: subject.beginner_count,
            intermediate: subject.intermediate_count,
            advanced: subject.advanced_count,
            specialist: subject.specialist_count,
          },
        }));
      },
    },
    catalog: createKnowledgeCatalogStore(database),
  };
}

export type KnowledgeStore = ReturnType<typeof createKnowledgeStore>;
