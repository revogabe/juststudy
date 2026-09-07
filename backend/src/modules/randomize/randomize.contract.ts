import type { KnowledgeTopic } from "@/modules/knowledge";
import type { RANDOMIZE_STATUSES } from "./randomize.constant";

export type RandomizationStatus = (typeof RANDOMIZE_STATUSES)[number];

export type TopicRandomizationRecord = {
  id: string;
  user_id: string;
  subject_slug: string;
  topic_slug: string;
  status: RandomizationStatus;
  created_at: Date;
  updated_at: Date;
};

export type TopicRandomization = {
  id: string;
  subject: KnowledgeTopic["subject"];
  topic: KnowledgeTopic["topic"];
  status: RandomizationStatus;
  created_at: Date;
  updated_at: Date;
};

export type PendingTopicRandomization = Omit<TopicRandomization, "status"> & {
  status: "pending";
};

export type TopicRandomizationCreate = {
  user_id: string;
  subject_slug: string;
  topic_slug: string;
  status: "pending";
};

export type RandomizeTopicCommand = {
  user_id: string;
  subject_slug: string | null;
};

export type RandomizeHistoryQuery = {
  user_id: string;
  limit: number;
  cursor: string | null;
};

export type RandomizeHistoryPage = {
  randomizations: TopicRandomization[];
  next_cursor: string | null;
};

export type RandomizeHistoryRecordPage = {
  randomizations: TopicRandomizationRecord[];
  next_cursor: string | null;
};

export type RandomizationAttemptQuery = {
  id: string;
  user_id: string;
};

export type RandomizationAttemptSearchQuery = {
  ids: string[];
  user_id: string;
};

export type RandomizationAttemptUpdate = RandomizationAttemptQuery & {
  status: Extract<RandomizationStatus, "abandoned" | "completed">;
  updated_at: Date;
};
