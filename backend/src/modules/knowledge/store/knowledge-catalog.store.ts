import { and, eq, inArray, or } from "drizzle-orm";
import type { DatabaseClient, DatabaseTransaction } from "@/infrastructure/database";
import type {
  KnowledgeCatalogUpdateResult,
  KnowledgeCatalogWrite,
  KnowledgeTopicInput,
} from "../knowledge.contract";
import { KnowledgeCatalogConflictError, KnowledgeSubjectNotFoundError } from "../knowledge.error";
import { knowledge_subjects, knowledge_topics } from "../knowledge.model";

type CatalogTransaction = DatabaseTransaction;

export function createKnowledgeCatalogStore(database: DatabaseClient) {
  return {
    async update(input: KnowledgeCatalogWrite): Promise<KnowledgeCatalogUpdateResult> {
      return database.transaction(async (transaction) => {
        const result: KnowledgeCatalogUpdateResult = {
          subjects_created: 0,
          subjects_skipped: 0,
          topics_created: 0,
          topics_skipped: 0,
        };

        for (const subject of input.subjects) {
          const [insertedSubject] = await transaction
            .insert(knowledge_subjects)
            .values({ slug: subject.slug, name: subject.name })
            .onConflictDoNothing()
            .returning({ slug: knowledge_subjects.slug });
          const subjectStatus = insertedSubject ? "created" : "skipped";

          if (!insertedSubject) {
            const [storedSubject] = await transaction
              .select({ name: knowledge_subjects.name })
              .from(knowledge_subjects)
              .where(eq(knowledge_subjects.slug, subject.slug));

            if (storedSubject?.name !== subject.name) throw new KnowledgeCatalogConflictError();
          }

          const topicStatus = await updateTopicGroup(transaction, subject.slug, subject.topics);

          if (subjectStatus !== topicStatus) throw new KnowledgeCatalogConflictError();

          if (subjectStatus === "created") result.subjects_created += 1;
          if (subjectStatus === "skipped") result.subjects_skipped += 1;
          if (topicStatus === "created") result.topics_created += subject.topics.length;
          if (topicStatus === "skipped") result.topics_skipped += subject.topics.length;
        }

        for (const batch of input.topic_batches) {
          const [subject] = await transaction
            .select({ slug: knowledge_subjects.slug })
            .from(knowledge_subjects)
            .where(eq(knowledge_subjects.slug, batch.subject_slug));

          if (!subject) throw new KnowledgeSubjectNotFoundError();

          const status = await updateTopicGroup(transaction, batch.subject_slug, batch.topics);

          if (status === "created") result.topics_created += batch.topics.length;
          if (status === "skipped") result.topics_skipped += batch.topics.length;
        }

        return result;
      });
    },
  };
}

async function updateTopicGroup(
  transaction: CatalogTransaction,
  subjectSlug: string,
  topics: KnowledgeTopicInput[],
): Promise<"created" | "skipped"> {
  const values = new Array<KnowledgeTopicInput & { subject_slug: string }>(topics.length);
  const slugs = new Array<string>(topics.length);
  const names = new Array<string>(topics.length);
  const expectedBySlug = new Map<string, KnowledgeTopicInput>();

  for (const [index, topic] of topics.entries()) {
    values[index] = { ...topic, subject_slug: subjectSlug };
    slugs[index] = topic.slug;
    names[index] = topic.name;
    expectedBySlug.set(topic.slug, topic);
  }

  const inserted = await transaction
    .insert(knowledge_topics)
    .values(values)
    .onConflictDoNothing()
    .returning({ slug: knowledge_topics.slug });

  if (inserted.length === topics.length) return "created";
  if (inserted.length > 0) throw new KnowledgeCatalogConflictError();

  const storedTopics = await transaction
    .select({
      slug: knowledge_topics.slug,
      name: knowledge_topics.name,
      level: knowledge_topics.level,
    })
    .from(knowledge_topics)
    .where(
      and(
        eq(knowledge_topics.subject_slug, subjectSlug),
        or(inArray(knowledge_topics.slug, slugs), inArray(knowledge_topics.name, names)),
      ),
    );

  if (storedTopics.length !== topics.length) throw new KnowledgeCatalogConflictError();

  for (const stored of storedTopics) {
    const expected = expectedBySlug.get(stored.slug);

    if (expected?.name !== stored.name || expected.level !== stored.level) {
      throw new KnowledgeCatalogConflictError();
    }
  }

  return "skipped";
}
