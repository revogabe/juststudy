import { describe, expect, it } from "bun:test";
import type {
  KnowledgeAssessmentWriter,
  KnowledgeCatalogUpdateResult,
  KnowledgeLevel,
  KnowledgeTopicInput,
} from "@/modules/knowledge/knowledge.contract";
import { KnowledgeCatalogConflictError, KnowledgeSubjectNotFoundError } from "@/modules/knowledge/knowledge.error";
import { createKnowledgeService } from "@/modules/knowledge/knowledge.service";
import type { KnowledgeStore } from "@/modules/knowledge/store/knowledge.store";

const CREATED: KnowledgeCatalogUpdateResult = {
  subjects_created: 1,
  subjects_skipped: 0,
  topics_created: 100,
  topics_skipped: 0,
};

function topics(distribution: Record<KnowledgeLevel, number>): KnowledgeTopicInput[] {
  const result: KnowledgeTopicInput[] = [];

  for (const [level, count] of Object.entries(distribution)) {
    for (let index = 1; index <= count; index += 1) {
      result.push({
        slug: `${level}-topic-${index}`,
        name: `${level} topic ${index}`,
        level: level as KnowledgeLevel,
      });
    }
  }

  return result;
}

const unusedWriter: KnowledgeAssessmentWriter = {
  assessment: {
    async create() {
      throw new Error("Not used");
    },
  },
};

function createStore(update: KnowledgeStore["catalog"]["update"] = async () => CREATED): KnowledgeStore {
  return {
    subject: {
      async get() {
        return [];
      },
      async exists() {
        return false;
      },
    },
    topic: {
      async search() {
        return [];
      },
      async get() {
        return [];
      },
      async searchWithoutAssessment() {
        return [];
      },
    },
    assessment: {
      async get() {
        return null;
      },
      async create() {
        return true;
      },
    },
    catalog: { update },
  };
}

describe("knowledge service", () => {
  it("accepts a new subject with the required 100-topic distribution", async () => {
    let receivedTopics = 0;
    const store = createStore(async (catalog) => {
      receivedTopics = catalog.subjects[0]?.topics.length ?? 0;
      return CREATED;
    });
    const service = createKnowledgeService({ writer: unusedWriter, store });

    await expect(
      service.catalog.update({
        subjects: [
          {
            slug: "education",
            name: "Education",
            topics: topics({ beginner: 15, intermediate: 35, advanced: 30, specialist: 20 }),
          },
        ],
      }),
    ).resolves.toEqual(CREATED);
    expect(receivedTopics).toBe(100);
  });

  it("accepts balanced topic expansions in multiples of 20", async () => {
    const service = createKnowledgeService({ writer: unusedWriter, store: createStore() });

    await expect(
      service.catalog.update({
        topic_batches: [
          {
            subject_slug: "mathematics",
            topics: topics({ beginner: 6, intermediate: 14, advanced: 12, specialist: 8 }),
          },
        ],
      }),
    ).resolves.toEqual(CREATED);
  });

  it("rejects empty and unbalanced catalog updates", async () => {
    const service = createKnowledgeService({ writer: unusedWriter, store: createStore() });

    await expect(service.catalog.update({})).rejects.toMatchObject({
      code: "KNOWLEDGE_CATALOG_UNBALANCED",
      status: 422,
    });
    await expect(
      service.catalog.update({
        topic_batches: [
          {
            subject_slug: "mathematics",
            topics: topics({ beginner: 4, intermediate: 7, advanced: 5, specialist: 4 }),
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "KNOWLEDGE_CATALOG_UNBALANCED" });
  });

  it("preserves idempotent replay counts returned by the store", async () => {
    const replay: KnowledgeCatalogUpdateResult = {
      subjects_created: 0,
      subjects_skipped: 1,
      topics_created: 0,
      topics_skipped: 100,
    };
    const service = createKnowledgeService({ writer: unusedWriter, store: createStore(async () => replay) });

    await expect(
      service.catalog.update({
        subjects: [
          {
            slug: "education",
            name: "Education",
            topics: topics({ beginner: 15, intermediate: 35, advanced: 30, specialist: 20 }),
          },
        ],
      }),
    ).resolves.toEqual(replay);
  });

  it("translates store conflicts and missing subjects into product errors", async () => {
    const conflictService = createKnowledgeService({
      writer: unusedWriter,
      store: createStore(async () => {
        throw new KnowledgeCatalogConflictError();
      }),
    });
    const missingSubjectService = createKnowledgeService({
      writer: unusedWriter,
      store: createStore(async () => {
        throw new KnowledgeSubjectNotFoundError();
      }),
    });
    const command = {
      topic_batches: [
        {
          subject_slug: "mathematics",
          topics: topics({ beginner: 3, intermediate: 7, advanced: 6, specialist: 4 }),
        },
      ],
    };

    await expect(conflictService.catalog.update(command)).rejects.toMatchObject({
      code: "KNOWLEDGE_CATALOG_CONFLICT",
      status: 409,
    });
    await expect(missingSubjectService.catalog.update(command)).rejects.toMatchObject({
      code: "KNOWLEDGE_CATALOG_UNBALANCED",
      status: 422,
    });
  });

  it("prefers a generated assessment and falls back to the catalog template", async () => {
    const topic = {
      subject: { slug: "biology", name: "Biologia" },
      topic: { slug: "photosynthesis", name: "Fotossíntese", level: "intermediate" as const },
    };
    const generated = {
      reference_summary: "O oxigênio liberado vem da água.",
      key_concepts: ["Fotólise da água"],
      common_misconceptions: ["O oxigênio vem do CO2"],
      version: "generated-v1",
    };
    const store = createStore();
    store.topic.get = async () => [topic];
    store.assessment.get = async () => generated;
    const service = createKnowledgeService({ writer: unusedWriter, store });

    expect((await service.assessment.get({ subject_slug: "biology", topic_slug: "photosynthesis" }))?.assessment).toEqual(generated);

    store.assessment.get = async () => null;

    expect((await service.assessment.get({ subject_slug: "biology", topic_slug: "photosynthesis" }))?.assessment.version).toBe(
      "catalog-template-v1",
    );
  });

  it("generates assessments for topics without one and keeps going after a failure", async () => {
    const saved: string[] = [];
    const store = createStore();
    store.topic.searchWithoutAssessment = async () => [
      { subject: { slug: "biology", name: "Biologia" }, topic: { slug: "meiosis", name: "Meiose", level: "intermediate" } },
      { subject: { slug: "biology", name: "Biologia" }, topic: { slug: "mitosis", name: "Mitose", level: "intermediate" } },
    ];
    store.assessment.create = async (input) => {
      saved.push(`${input.topic_slug}:${input.model}:${input.assessment.version}`);
      return true;
    };
    const writer: KnowledgeAssessmentWriter = {
      assessment: {
        async create(topic) {
          if (topic.topic.slug === "mitosis") throw new Error("provider unavailable");

          return {
            assessment: { reference_summary: "Resumo", key_concepts: ["A"], common_misconceptions: ["B"], version: "generated-v1" },
            provider: "openai",
            model: "gpt-5.6-luna",
            prompt_version: "local-v1",
          };
        },
      },
    };
    const service = createKnowledgeService({ writer, store, now: () => new Date("2026-09-28T12:00:00.000Z") });

    expect(await service.assessment.create(5)).toEqual({ topics_generated: 1, topics_failed: 1 });
    expect(saved).toEqual(["meiosis:gpt-5.6-luna:generated-v1"]);
  });
});
