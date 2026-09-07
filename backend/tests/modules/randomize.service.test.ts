import { describe, expect, it } from "bun:test";
import type {
  KnowledgeService,
  KnowledgeTopic,
  KnowledgeTopicReference,
} from "@/modules/knowledge";
import type {
  RandomizationStatus,
  RandomizeHistoryRecordPage,
  TopicRandomizationCreate,
  TopicRandomizationRecord,
} from "@/modules/randomize/randomize.contract";
import { createRandomizeService } from "@/modules/randomize/randomize.service";
import type { RandomizeStore } from "@/modules/randomize/randomize.store";

const CREATED_AT = new Date("2026-09-07T10:00:00.000Z");

type RandomizeKnowledge = {
  subject: Pick<KnowledgeService["subject"], "exists">;
  topic: KnowledgeService["topic"];
};

function knowledgeTopic(subjectSlug: string, topicSlug: string): KnowledgeTopic {
  return {
    subject: {
      slug: subjectSlug,
      name: `${subjectSlug} name`,
    },
    topic: {
      slug: topicSlug,
      name: `${topicSlug} name`,
      level: "beginner",
    },
  };
}

function createKnowledge(
  topics: KnowledgeTopic[],
  additionalSubjects: string[] = [],
): RandomizeKnowledge {
  const subjects = new Set([...topics.map((topic) => topic.subject.slug), ...additionalSubjects]);

  return {
    subject: {
      async exists(subjectSlug: string) {
        return subjects.has(subjectSlug);
      },
    },
    topic: {
      async search(subjectSlug) {
        if (!subjectSlug) return topics;

        return topics.filter((topic) => topic.subject.slug === subjectSlug);
      },
      async get(references) {
        const referenceKeys = new Set(
          references.map((reference) => `${reference.subject_slug}/${reference.topic_slug}`),
        );

        return topics.filter((topic) =>
          referenceKeys.has(`${topic.subject.slug}/${topic.topic.slug}`),
        );
      },
    },
  };
}

function randomizationRecord(
  input: TopicRandomizationCreate,
  id = "00000000-0000-4000-8000-000000000001",
): TopicRandomizationRecord {
  return {
    id,
    ...input,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
  };
}

function createStore(input?: {
  blockedTopics?: KnowledgeTopicReference[];
  blockedSearch?: RandomizeStore["blockedTopic"]["search"];
  create?: RandomizeStore["randomization"]["create"];
  history?: RandomizeHistoryRecordPage;
}): RandomizeStore {
  return {
    blockedTopic: {
      search: input?.blockedSearch ?? (async () => input?.blockedTopics ?? []),
    },
    randomization: {
      create: input?.create ?? (async (command) => randomizationRecord(command)),
    },
    history: {
      async search() {
        return input?.history ?? { randomizations: [], next_cursor: null };
      },
    },
  };
}

function randomSequence(...values: number[]): () => number {
  let index = 0;

  return () => values[index++] ?? 0;
}

describe("randomize service", () => {
  it("randomizes an eligible topic inside the requested subject", async () => {
    const first = knowledgeTopic("mathematics", "algebra");
    const second = knowledgeTopic("mathematics", "geometry");
    const service = createRandomizeService({
      knowledge: createKnowledge([first, second]),
      store: createStore({
        blockedTopics: [{ subject_slug: "mathematics", topic_slug: "algebra" }],
      }),
      random: () => 0,
    });

    await expect(
      service.topic.create({ user_id: "user-1", subject_slug: "mathematics" }),
    ).resolves.toMatchObject({
      subject: second.subject,
      topic: second.topic,
      status: "pending",
    });
  });

  it("chooses a subject uniformly before choosing one of its topics", async () => {
    const topics = [
      knowledgeTopic("mathematics", "algebra"),
      knowledgeTopic("mathematics", "geometry"),
      knowledgeTopic("physics", "mechanics"),
    ];
    const service = createRandomizeService({
      knowledge: createKnowledge(topics),
      store: createStore(),
      random: randomSequence(0.6, 0),
    });

    await expect(
      service.topic.create({ user_id: "user-1", subject_slug: null }),
    ).resolves.toMatchObject({
      subject: { slug: "physics" },
      topic: { slug: "mechanics" },
    });
  });

  it("blocks pending and completed topics while allowing abandoned topics", async () => {
    const completed = knowledgeTopic("mathematics", "algebra");
    const abandoned = knowledgeTopic("mathematics", "geometry");
    const attempts = [
      {
        reference: { subject_slug: "mathematics", topic_slug: "algebra" },
        status: "completed" as const,
      },
      {
        reference: { subject_slug: "mathematics", topic_slug: "geometry" },
        status: "abandoned" as const,
      },
    ];
    let blockingStatuses: RandomizationStatus[] = [];
    const service = createRandomizeService({
      knowledge: createKnowledge([completed, abandoned]),
      store: createStore({
        async blockedSearch(_userId, statuses) {
          blockingStatuses = statuses;

          return attempts
            .filter((attempt) => statuses.includes(attempt.status))
            .map((attempt) => attempt.reference);
        },
      }),
      random: () => 0,
    });

    await expect(
      service.topic.create({ user_id: "user-1", subject_slug: "mathematics" }),
    ).resolves.toMatchObject({ topic: { slug: "geometry" } });
    expect(blockingStatuses).toEqual(["pending", "completed"]);
  });

  it("retries another candidate after a concurrent active-topic conflict", async () => {
    const topics = [
      knowledgeTopic("mathematics", "algebra"),
      knowledgeTopic("mathematics", "geometry"),
    ];
    const attemptedTopics: string[] = [];
    const service = createRandomizeService({
      knowledge: createKnowledge(topics),
      store: createStore({
        async create(command) {
          attemptedTopics.push(command.topic_slug);

          if (attemptedTopics.length === 1) return null;

          return randomizationRecord(command);
        },
      }),
      random: () => 0,
    });

    await expect(
      service.topic.create({ user_id: "user-1", subject_slug: "mathematics" }),
    ).resolves.toMatchObject({ topic: { slug: "geometry" } });
    expect(attemptedTopics).toEqual(["algebra", "geometry"]);
  });

  it("reports missing subjects and exhausted eligible topics", async () => {
    const topic = knowledgeTopic("mathematics", "algebra");
    const missingSubjectService = createRandomizeService({
      knowledge: createKnowledge([topic]),
      store: createStore(),
    });
    const exhaustedService = createRandomizeService({
      knowledge: createKnowledge([topic]),
      store: createStore({
        blockedTopics: [{ subject_slug: "mathematics", topic_slug: "algebra" }],
      }),
    });
    const emptySubjectService = createRandomizeService({
      knowledge: createKnowledge([], ["mathematics"]),
      store: createStore(),
    });

    await expect(
      missingSubjectService.topic.create({ user_id: "user-1", subject_slug: "unknown" }),
    ).rejects.toMatchObject({ code: "RANDOMIZE_SUBJECT_NOT_FOUND", status: 404 });
    await expect(
      exhaustedService.topic.create({ user_id: "user-1", subject_slug: "mathematics" }),
    ).rejects.toMatchObject({ code: "RANDOMIZE_TOPIC_UNAVAILABLE", status: 409 });
    await expect(
      emptySubjectService.topic.create({ user_id: "user-1", subject_slug: "mathematics" }),
    ).rejects.toMatchObject({ code: "RANDOMIZE_TOPIC_UNAVAILABLE", status: 409 });
  });

  it("enriches a cursor page without changing its timeline order", async () => {
    const mathematics = knowledgeTopic("mathematics", "algebra");
    const physics = knowledgeTopic("physics", "mechanics");
    const first = randomizationRecord(
      {
        user_id: "user-1",
        subject_slug: "physics",
        topic_slug: "mechanics",
        status: "pending",
      },
      "00000000-0000-4000-8000-000000000002",
    );
    const second = randomizationRecord(
      {
        user_id: "user-1",
        subject_slug: "mathematics",
        topic_slug: "algebra",
        status: "pending",
      },
      "00000000-0000-4000-8000-000000000001",
    );
    const service = createRandomizeService({
      knowledge: createKnowledge([mathematics, physics]),
      store: createStore({
        history: {
          randomizations: [first, second],
          next_cursor: second.id,
        },
      }),
    });

    await expect(
      service.history.search({ user_id: "user-1", limit: 2, cursor: null }),
    ).resolves.toMatchObject({
      randomizations: [
        { id: first.id, subject: physics.subject, topic: physics.topic },
        { id: second.id, subject: mathematics.subject, topic: mathematics.topic },
      ],
      next_cursor: second.id,
    });
  });
});
