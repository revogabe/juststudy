export const SCORE_ALGORITHM_VERSION = "ordinal_bayes_v1";
export const SCORE_MAX_CHANGE = 100;
export const SCORE_PROVISIONAL_TOPIC_COUNT = 5;

export const SCORE_LEVEL_ORDER = ["beginner", "intermediate", "advanced", "specialist"] as const;

export const SCORE_LEVEL_CEILINGS = {
  beginner: 400,
  intermediate: 650,
  advanced: 900,
  specialist: 1000,
} as const;

export const SCORE_LEVEL_DIFFICULTIES = {
  beginner: 250,
  intermediate: 500,
  advanced: 750,
  specialist: 900,
} as const;
