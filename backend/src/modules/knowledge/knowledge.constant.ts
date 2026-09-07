export const KNOWLEDGE_LEVELS = ["beginner", "intermediate", "advanced", "specialist"] as const;

export const KNOWLEDGE_NEW_SUBJECT_TOPIC_COUNT = 100;
export const KNOWLEDGE_TOPIC_BATCH_SIZE = 20;

export const KNOWLEDGE_NEW_SUBJECT_DISTRIBUTION = {
  beginner: 15,
  intermediate: 35,
  advanced: 30,
  specialist: 20,
} as const;

export const KNOWLEDGE_TOPIC_BATCH_DISTRIBUTION = {
  beginner: 3,
  intermediate: 7,
  advanced: 6,
  specialist: 4,
} as const;
