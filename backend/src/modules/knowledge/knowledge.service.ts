import type {
  KnowledgeAssessmentGeneration,
  KnowledgeAssessmentWriter,
  KnowledgeCatalogUpdate,
  KnowledgeTopicReference,
} from "./knowledge.contract";
import { KnowledgeCatalogConflictError, KnowledgeSubjectNotFoundError, knowledgeError } from "./knowledge.error";
import { knowledgeCatalogRule } from "./knowledge.rule";
import { knowledgeAssessmentRule } from "./knowledge-assessment.rule";
import type { KnowledgeStore } from "./store/knowledge.store";

type KnowledgeServiceInput = {
  store: KnowledgeStore;
  writer: KnowledgeAssessmentWriter;
  now?: () => Date;
};

export function createKnowledgeService(input: KnowledgeServiceInput) {
  const now = input.now ?? (() => new Date());

  return {
    subject: {
      get() {
        return input.store.subject.get();
      },
      exists(subjectSlug: string) {
        return input.store.subject.exists(subjectSlug);
      },
    },
    topic: {
      search(subjectSlug?: string) {
        return input.store.topic.search(subjectSlug);
      },
      get: input.store.topic.get,
    },
    assessment: {
      async get(reference: KnowledgeTopicReference) {
        const [topic] = await input.store.topic.get([reference]);

        if (!topic) return null;

        const assessment = await input.store.assessment.get(reference);

        return assessment ? { ...topic, assessment } : knowledgeAssessmentRule.create(topic);
      },
      async create(limit: number): Promise<KnowledgeAssessmentGeneration> {
        const topics = await input.store.topic.searchWithoutAssessment(limit);
        const result: KnowledgeAssessmentGeneration = { topics_generated: 0, topics_failed: 0 };

        for (const topic of topics) {
          try {
            const generated = await input.writer.assessment.create(topic);

            await input.store.assessment.create({
              subject_slug: topic.subject.slug,
              topic_slug: topic.topic.slug,
              ...generated,
              created_at: now(),
            });
            result.topics_generated += 1;
          } catch (error) {
            console.error(`Knowledge assessment generation failed for ${topic.subject.slug}/${topic.topic.slug}.`, error);
            result.topics_failed += 1;
          }
        }

        return result;
      },
    },
    catalog: {
      async update(command: KnowledgeCatalogUpdate) {
        const catalog = knowledgeCatalogRule.validate(command);

        try {
          return await input.store.catalog.update(catalog);
        } catch (error) {
          if (error instanceof KnowledgeCatalogConflictError) throw knowledgeError.conflict();
          if (error instanceof KnowledgeSubjectNotFoundError) {
            throw knowledgeError.unbalanced("Every topic batch must reference an existing subject.");
          }

          throw error;
        }
      },
    },
  };
}

export type KnowledgeService = ReturnType<typeof createKnowledgeService>;
