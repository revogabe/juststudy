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

export type KnowledgeTopicReference = {
  subject_slug: string;
  topic_slug: string;
};

export type KnowledgeTopic = {
  subject: {
    slug: string;
    name: string;
  };
  topic: {
    slug: string;
    name: string;
    level: KnowledgeLevel;
  };
};

export type KnowledgeAssessmentContext = KnowledgeTopic & {
  assessment: {
    reference_summary: string;
    key_concepts: string[];
    common_misconceptions: string[];
    version: string;
  };
};

export type KnowledgeAssessment = KnowledgeAssessmentContext["assessment"];

export type KnowledgeGeneratedAssessment = {
  assessment: KnowledgeAssessment;
  provider: string;
  model: string;
  prompt_version: string;
};

export type KnowledgeAssessmentWrite = KnowledgeTopicReference &
  KnowledgeGeneratedAssessment & {
    created_at: Date;
  };

export type KnowledgeAssessmentGeneration = {
  topics_generated: number;
  topics_failed: number;
};

export type KnowledgeAssessmentWriter = {
  assessment: {
    create(topic: KnowledgeTopic): Promise<KnowledgeGeneratedAssessment>;
  };
};
