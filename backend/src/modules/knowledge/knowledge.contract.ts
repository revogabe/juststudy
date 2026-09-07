import type { KNOWLEDGE_LEVELS } from "./knowledge.constant";

export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number];

export type KnowledgeTopicInput = {
  slug: string;
  name: string;
  level: KnowledgeLevel;
};

export type KnowledgeSubjectInput = {
  slug: string;
  name: string;
  topics: KnowledgeTopicInput[];
};

export type KnowledgeTopicBatch = {
  subject_slug: string;
  topics: KnowledgeTopicInput[];
};

export type KnowledgeCatalogUpdate = {
  subjects?: KnowledgeSubjectInput[];
  topic_batches?: KnowledgeTopicBatch[];
};

export type KnowledgeCatalogWrite = {
  subjects: KnowledgeSubjectInput[];
  topic_batches: KnowledgeTopicBatch[];
};

export type KnowledgeCatalogUpdateResult = {
  subjects_created: number;
  subjects_skipped: number;
  topics_created: number;
  topics_skipped: number;
};

export type KnowledgeSubjectSummary = {
  slug: string;
  name: string;
  topic_count: number;
  level_counts: Record<KnowledgeLevel, number>;
};
