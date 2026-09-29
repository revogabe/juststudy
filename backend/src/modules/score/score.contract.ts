import type { KnowledgeLevel } from "@/modules/knowledge/knowledge.contract";

export type ScoreEvaluation = {
  evaluation_id: string;
  feedback_session_id: string;
  user_id: string;
  subject_slug: string;
  topic_slug: string;
  topic_level: KnowledgeLevel;
  mastery: number;
  factual_accuracy: number;
  has_critical_misconception: boolean;
  occurred_at: Date;
};

export type ScoreEventRecord = ScoreEvaluation & {
  id: string;
  mastery_band: number;
  algorithm_version: string;
  score_before: number;
  score_after: number;
  created_at: Date;
};

export type SubjectScoreRecord = {
  user_id: string;
  subject_slug: string;
  score: number;
  certified_level: KnowledgeLevel | null;
  evaluations_count: number;
  distinct_topics_count: number;
  provisional: boolean;
  algorithm_version: string;
  updated_at: Date;
};

export type ScoreUpdate = {
  before: number;
  after: number;
  delta: number;
  algorithm_version: string;
  snapshot: SubjectScoreRecord;
};

export type SubjectScore = Omit<SubjectScoreRecord, "user_id"> & {
  subject_name: string;
};
