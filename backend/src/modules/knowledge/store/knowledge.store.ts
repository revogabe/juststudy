import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";
import type { DatabaseClient } from "@/infrastructure/database";
import type {
  KnowledgeAssessment,
  KnowledgeAssessmentWrite,
  KnowledgeSubjectSummary,
  KnowledgeTopic,
  KnowledgeTopicReference,
} from "../knowledge.contract";
import { knowledge_subjects, knowledge_topic_assessments, knowledge_topics } from "../knowledge.model";
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
            beginner_count: sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'beginner')`.mapWith(
              Number,
            ),
            intermediate_count:
              sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'intermediate')`.mapWith(Number),
            advanced_count: sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'advanced')`.mapWith(
              Number,
            ),
            specialist_count: sql<number>`count(${knowledge_topics.slug}) filter (where ${knowledge_topics.level} = 'specialist')`.mapWith(
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
      searchWithoutAssessment(limit: number): Promise<KnowledgeTopic[]> {
        return searchTopicsWithoutAssessment(database, limit);
      },
    },
    assessment: {
      get(reference: KnowledgeTopicReference): Promise<KnowledgeAssessment | null> {
        return getAssessment(database, reference);
      },
      async create(input: KnowledgeAssessmentWrite): Promise<boolean> {
        const [created] = await database
          .insert(knowledge_topic_assessments)
          .values({
            subject_slug: input.subject_slug,
            topic_slug: input.topic_slug,
            reference_summary: input.assessment.reference_summary,
            key_concepts: input.assessment.key_concepts,
            common_misconceptions: input.assessment.common_misconceptions,
            version: input.assessment.version,
            provider: input.provider,
            model: input.model,
            prompt_version: input.prompt_version,
            created_at: input.created_at,
          })
          .onConflictDoNothing()
          .returning({ topic_slug: knowledge_topic_assessments.topic_slug });

        return Boolean(created);
      },
    },
    catalog: createKnowledgeCatalogStore(database),
  };
}

async function searchTopics(database: DatabaseClient, subjectSlug?: string): Promise<KnowledgeTopic[]> {
  const query = selectTopics(database);
  const topics = subjectSlug ? await query.where(eq(knowledge_topics.subject_slug, subjectSlug)) : await query;

  return topics.map(toKnowledgeTopic);
}

async function getTopics(database: DatabaseClient, references: KnowledgeTopicReference[]): Promise<KnowledgeTopic[]> {
  if (references.length === 0) return [];

  const topicConditions = references.map((reference) =>
    and(eq(knowledge_topics.subject_slug, reference.subject_slug), eq(knowledge_topics.slug, reference.topic_slug)),
  );
  const topics = await selectTopics(database).where(or(...topicConditions));

  return topics.map(toKnowledgeTopic);
}

async function searchTopicsWithoutAssessment(database: DatabaseClient, limit: number): Promise<KnowledgeTopic[]> {
  const topics = await selectTopics(database)
    .leftJoin(
      knowledge_topic_assessments,
      and(
        eq(knowledge_topic_assessments.subject_slug, knowledge_topics.subject_slug),
        eq(knowledge_topic_assessments.topic_slug, knowledge_topics.slug),
      ),
    )
    .where(isNull(knowledge_topic_assessments.topic_slug))
    .orderBy(asc(knowledge_topics.subject_slug), asc(knowledge_topics.slug))
    .limit(limit);

  return topics.map(toKnowledgeTopic);
}

async function getAssessment(database: DatabaseClient, reference: KnowledgeTopicReference): Promise<KnowledgeAssessment | null> {
  const [assessment] = await database
    .select({
      reference_summary: knowledge_topic_assessments.reference_summary,
      key_concepts: knowledge_topic_assessments.key_concepts,
      common_misconceptions: knowledge_topic_assessments.common_misconceptions,
      version: knowledge_topic_assessments.version,
    })
    .from(knowledge_topic_assessments)
    .where(
      and(
        eq(knowledge_topic_assessments.subject_slug, reference.subject_slug),
        eq(knowledge_topic_assessments.topic_slug, reference.topic_slug),
      ),
    );

  return assessment ?? null;
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
