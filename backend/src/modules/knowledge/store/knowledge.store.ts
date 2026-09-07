import { and, asc, count, eq, or, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import type {
  KnowledgeSubjectSummary,
  KnowledgeTopic,
  KnowledgeTopicReference,
} from "../knowledge.contract";
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
      async exists(subjectSlug: string): Promise<boolean> {
        const [subject] = await database
          .select({ slug: knowledge_subjects.slug })
          .from(knowledge_subjects)
          .where(eq(knowledge_subjects.slug, subjectSlug));

        return Boolean(subject);
      },
    },
    topic: {
      search(subjectSlug?: string): Promise<KnowledgeTopic[]> {
        return searchTopics(database, subjectSlug);
      },
      get(references: KnowledgeTopicReference[]): Promise<KnowledgeTopic[]> {
        return getTopics(database, references);
      },
    },
    catalog: createKnowledgeCatalogStore(database),
  };
}

async function searchTopics(
  database: DatabaseClient,
  subjectSlug?: string,
): Promise<KnowledgeTopic[]> {
  const query = selectTopics(database);
  const topics = subjectSlug
    ? await query.where(eq(knowledge_topics.subject_slug, subjectSlug))
    : await query;

  return topics.map(toKnowledgeTopic);
}

async function getTopics(
  database: DatabaseClient,
  references: KnowledgeTopicReference[],
): Promise<KnowledgeTopic[]> {
  if (references.length === 0) return [];

  const topicConditions = references.map((reference) =>
    and(
      eq(knowledge_topics.subject_slug, reference.subject_slug),
      eq(knowledge_topics.slug, reference.topic_slug),
    ),
  );
  const topics = await selectTopics(database).where(or(...topicConditions));

  return topics.map(toKnowledgeTopic);
}

function selectTopics(database: DatabaseClient) {
  return database
    .select({
      subject_slug: knowledge_subjects.slug,
      subject_name: knowledge_subjects.name,
      topic_slug: knowledge_topics.slug,
      topic_name: knowledge_topics.name,
      topic_level: knowledge_topics.level,
    })
    .from(knowledge_topics)
    .innerJoin(knowledge_subjects, eq(knowledge_subjects.slug, knowledge_topics.subject_slug));
}

function toKnowledgeTopic(input: {
  subject_slug: string;
  subject_name: string;
  topic_slug: string;
  topic_name: string;
  topic_level: KnowledgeTopic["topic"]["level"];
}): KnowledgeTopic {
  return {
    subject: {
      slug: input.subject_slug,
      name: input.subject_name,
    },
    topic: {
      slug: input.topic_slug,
      name: input.topic_name,
      level: input.topic_level,
    },
  };
}

export type KnowledgeStore = ReturnType<typeof createKnowledgeStore>;
