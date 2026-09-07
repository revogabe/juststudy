import type {
  KnowledgeService,
  KnowledgeTopic,
  KnowledgeTopicReference,
} from "@/modules/knowledge";
import { RANDOMIZE_BLOCKING_STATUSES } from "./randomize.constant";
import type {
  PendingTopicRandomization,
  RandomizationAttemptQuery,
  RandomizationAttemptSearchQuery,
  RandomizationAttemptUpdate,
  RandomizeHistoryPage,
  RandomizeHistoryQuery,
  RandomizeTopicCommand,
  TopicRandomization,
  TopicRandomizationRecord,
} from "./randomize.contract";
import { randomizeError } from "./randomize.error";
import { randomizeTopicRule } from "./randomize.rule";
import type { RandomizeStore } from "./randomize.store";

type RandomizeKnowledge = {
  subject: Pick<KnowledgeService["subject"], "exists">;
  topic: KnowledgeService["topic"];
};

type RandomizeServiceInput = {
  store: RandomizeStore;
  knowledge: RandomizeKnowledge;
  random?: () => number;
};

export function createRandomizeService(input: RandomizeServiceInput) {
  const random = input.random ?? Math.random;

  return {
    attempt: {
      get(query: RandomizationAttemptQuery): Promise<TopicRandomizationRecord | null> {
        return input.store.attempt.get(query);
      },
      async search(query: RandomizationAttemptSearchQuery): Promise<TopicRandomization[]> {
        const randomizations = await input.store.attempt.search(query);

        return enrichRandomizations(input.knowledge, randomizations);
      },
      update(command: RandomizationAttemptUpdate): Promise<TopicRandomizationRecord | null> {
        return input.store.attempt.update(command);
      },
    },
    topic: {
      async create(command: RandomizeTopicCommand): Promise<PendingTopicRandomization> {
        if (command.subject_slug && !(await input.knowledge.subject.exists(command.subject_slug)))
          throw randomizeError.subjectNotFound();

        const topics = await input.knowledge.topic.search(command.subject_slug ?? undefined);
        const blockedTopics = await input.store.blockedTopic.search(command.user_id, [
          ...RANDOMIZE_BLOCKING_STATUSES,
        ]);

        while (true) {
          const topic = randomizeTopicRule.select({
            topics,
            blocked_topics: blockedTopics,
            random_subject: command.subject_slug === null,
            random,
          });

          if (!topic) throw randomizeError.topicUnavailable();

          const randomization = await input.store.randomization.create({
            user_id: command.user_id,
            subject_slug: topic.subject.slug,
            topic_slug: topic.topic.slug,
            status: "pending",
          });

          if (randomization) return toPendingTopicRandomization(randomization, topic);

          blockedTopics.push(toTopicReference(topic));
        }
      },
    },
    history: {
      async search(query: RandomizeHistoryQuery): Promise<RandomizeHistoryPage> {
        const history = await input.store.history.search(query);
        const randomizations = await enrichRandomizations(input.knowledge, history.randomizations);

        return {
          randomizations,
          next_cursor: history.next_cursor,
        };
      },
    },
  };
}

async function enrichRandomizations(
  knowledge: RandomizeKnowledge,
  records: TopicRandomizationRecord[],
): Promise<TopicRandomization[]> {
  const references = uniqueTopicReferences(records);
  const topics = await knowledge.topic.get(references);
  const topicsByReference = indexTopicsByReference(topics);

  return records.map((randomization) => {
    const topic = topicsByReference.get(randomization.subject_slug)?.get(randomization.topic_slug);

    if (!topic) throw new Error(`Knowledge topic missing for randomization ${randomization.id}.`);

    return toTopicRandomization(randomization, topic);
  });
}

function uniqueTopicReferences(
  randomizations: TopicRandomizationRecord[],
): KnowledgeTopicReference[] {
  const references: KnowledgeTopicReference[] = [];
  const topicSlugsBySubject = new Map<string, Set<string>>();

  for (const randomization of randomizations) {
    const topicSlugs = topicSlugsBySubject.get(randomization.subject_slug) ?? new Set<string>();

    if (topicSlugs.has(randomization.topic_slug)) continue;

    topicSlugs.add(randomization.topic_slug);
    topicSlugsBySubject.set(randomization.subject_slug, topicSlugs);
    references.push({
      subject_slug: randomization.subject_slug,
      topic_slug: randomization.topic_slug,
    });
  }

  return references;
}

function indexTopicsByReference(
  topics: KnowledgeTopic[],
): Map<string, Map<string, KnowledgeTopic>> {
  const topicsBySubject = new Map<string, Map<string, KnowledgeTopic>>();

  for (const topic of topics) {
    const subjectTopics = topicsBySubject.get(topic.subject.slug) ?? new Map();

    subjectTopics.set(topic.topic.slug, topic);
    topicsBySubject.set(topic.subject.slug, subjectTopics);
  }

  return topicsBySubject;
}

function toTopicRandomization(
  randomization: TopicRandomizationRecord,
  topic: KnowledgeTopic,
): TopicRandomization {
  return {
    id: randomization.id,
    subject: topic.subject,
    topic: topic.topic,
    status: randomization.status,
    created_at: randomization.created_at,
    updated_at: randomization.updated_at,
  };
}

function toPendingTopicRandomization(
  randomization: TopicRandomizationRecord,
  topic: KnowledgeTopic,
): PendingTopicRandomization {
  return {
    ...toTopicRandomization(randomization, topic),
    status: "pending",
  };
}

function toTopicReference(topic: KnowledgeTopic): KnowledgeTopicReference {
  return {
    subject_slug: topic.subject.slug,
    topic_slug: topic.topic.slug,
  };
}

export type RandomizeService = ReturnType<typeof createRandomizeService>;
