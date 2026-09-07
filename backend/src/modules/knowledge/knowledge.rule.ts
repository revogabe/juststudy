import {
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_NEW_SUBJECT_DISTRIBUTION,
  KNOWLEDGE_NEW_SUBJECT_TOPIC_COUNT,
  KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION,
  KNOWLEDGE_TOPIC_BATCH_SIZE,
} from "./knowledge.constant";
import type {
  KnowledgeCatalogUpdate,
  KnowledgeCatalogWrite,
  KnowledgeLevel,
  KnowledgeTopicInput,
} from "./knowledge.contract";
import { knowledgeError } from "./knowledge.error";

type TopicGroupValidation = {
  topicCount: number;
  distribution: Record<KnowledgeLevel, number>;
  distributionDetail: string;
};

function validateTopicGroup(topics: KnowledgeTopicInput[], validation: TopicGroupValidation): void {
  if (topics.length !== validation.topicCount) {
    throw knowledgeError.unbalanced(validation.distributionDetail);
  }

  const slugs = new Set<string>();
  const names = new Set<string>();
  const levelCounts: Record<KnowledgeLevel, number> = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    specialist: 0,
  };

  for (const topic of topics) {
    if (slugs.has(topic.slug) || names.has(topic.name)) {
      throw knowledgeError.unbalanced("Topics in one group must have unique slugs and names.");
    }

    slugs.add(topic.slug);
    names.add(topic.name);
    levelCounts[topic.level] += 1;
  }

  for (const level of KNOWLEDGE_LEVELS) {
    if (levelCounts[level] !== validation.distribution[level]) {
      throw knowledgeError.unbalanced(validation.distributionDetail);
    }
  }
}

function validateCatalogUpdate(input: KnowledgeCatalogUpdate): KnowledgeCatalogWrite {
  const subjects = input.subjects ?? [];
  const topicBatches = input.topic_batches ?? [];

  if (subjects.length === 0 && topicBatches.length === 0) {
    throw knowledgeError.unbalanced("Provide at least one subject or topic batch.");
  }

  const subjectSlugs = new Set<string>();
  const subjectNames = new Set<string>();

  for (const subject of subjects) {
    if (subjectSlugs.has(subject.slug) || subjectNames.has(subject.name)) {
      throw knowledgeError.unbalanced("Subjects in one update must have unique slugs and names.");
    }

    validateTopicGroup(subject.topics, {
      topicCount: KNOWLEDGE_NEW_SUBJECT_TOPIC_COUNT,
      distribution: KNOWLEDGE_NEW_SUBJECT_DISTRIBUTION,
      distributionDetail:
        "A new subject requires 100 topics distributed as 15 beginner, 35 intermediate, 30 advanced, and 20 specialist.",
    });

    subjectSlugs.add(subject.slug);
    subjectNames.add(subject.name);
  }

  const batchSubjectSlugs = new Set<string>();

  for (const batch of topicBatches) {
    if (subjectSlugs.has(batch.subject_slug) || batchSubjectSlugs.has(batch.subject_slug)) {
      throw knowledgeError.unbalanced("A subject can appear in only one catalog group per update.");
    }

    const multiplier = batch.topics.length / KNOWLEDGE_TOPIC_BATCH_SIZE;
    const distributionDetail =
      "A topic batch requires a positive multiple of 20 topics distributed as 3 beginner, 7 intermediate, 6 advanced, and 4 specialist per block.";

    if (!Number.isInteger(multiplier) || multiplier < 1) {
      throw knowledgeError.unbalanced(distributionDetail);
    }

    validateTopicGroup(batch.topics, {
      topicCount: KNOWLEDGE_TOPIC_BATCH_SIZE * multiplier,
      distribution: {
        beginner: KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION.beginner * multiplier,
        intermediate: KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION.intermediate * multiplier,
        advanced: KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION.advanced * multiplier,
        specialist: KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION.specialist * multiplier,
      },
      distributionDetail,
    });

    batchSubjectSlugs.add(batch.subject_slug);
  }

  return { subjects, topic_batches: topicBatches };
}

export const knowledgeCatalogRule = {
  validate: validateCatalogUpdate,
};
