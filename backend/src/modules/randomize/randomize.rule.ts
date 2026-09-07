import type { KnowledgeTopic, KnowledgeTopicReference } from "@/modules/knowledge";

type TopicSelectionInput = {
  topics: KnowledgeTopic[];
  blocked_topics: KnowledgeTopicReference[];
  random_subject: boolean;
  random: () => number;
};

function selectTopic(input: TopicSelectionInput): KnowledgeTopic | null {
  const blockedTopics = indexBlockedTopics(input.blocked_topics);

  if (!input.random_subject) {
    const eligibleTopics = input.topics.filter((topic) => !isBlocked(blockedTopics, topic));

    return randomItem(eligibleTopics, input.random);
  }

  const eligibleSubjects = new Map<string, KnowledgeTopic[]>();

  for (const topic of input.topics) {
    if (isBlocked(blockedTopics, topic)) continue;

    const subjectTopics = eligibleSubjects.get(topic.subject.slug);

    if (subjectTopics) {
      subjectTopics.push(topic);
      continue;
    }

    eligibleSubjects.set(topic.subject.slug, [topic]);
  }

  const subjectTopics = randomItem([...eligibleSubjects.values()], input.random);

  if (!subjectTopics) return null;

  return randomItem(subjectTopics, input.random);
}

function randomItem<Item>(items: Item[], random: () => number): Item | null {
  if (items.length === 0) return null;

  const index = Math.min(Math.floor(random() * items.length), items.length - 1);

  return items[index] ?? null;
}

function indexBlockedTopics(references: KnowledgeTopicReference[]): Map<string, Set<string>> {
  const topicsBySubject = new Map<string, Set<string>>();

  for (const reference of references) {
    const topicSlugs = topicsBySubject.get(reference.subject_slug) ?? new Set<string>();

    topicSlugs.add(reference.topic_slug);
    topicsBySubject.set(reference.subject_slug, topicSlugs);
  }

  return topicsBySubject;
}

function isBlocked(blockedTopics: Map<string, Set<string>>, topic: KnowledgeTopic): boolean {
  return blockedTopics.get(topic.subject.slug)?.has(topic.topic.slug) ?? false;
}

export const randomizeTopicRule = {
  select: selectTopic,
};
