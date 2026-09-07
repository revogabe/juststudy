import type { TopicRandomization } from "@/modules/randomize";
import type { FOCUS_STATUSES } from "./focus.constant";

export type FocusStatus = (typeof FOCUS_STATUSES)[number];
export type FocusTerminalStatus = Exclude<FocusStatus, "active">;

export type FocusSessionRecord = {
  id: string;
  randomization_id: string;
  user_id: string;
  duration_seconds: number;
  status: FocusStatus;
  started_at: Date;
  ends_at: Date;
  last_seen_at: Date;
  finished_at: Date | null;
  randomization_synced_at: Date | null;
  updated_at: Date;
};

export type FocusSession = Omit<FocusSessionRecord, "user_id" | "randomization_synced_at">;

export type FocusHistorySession = FocusSession & Pick<TopicRandomization, "subject" | "topic">;

export type FocusHistoryQuery = {
  user_id: string;
  limit: number;
  cursor: string | null;
};

export type FocusHistoryPage = {
  sessions: FocusHistorySession[];
  next_cursor: string | null;
};

export type FocusHistoryRecordPage = {
  sessions: FocusSessionRecord[];
  next_cursor: string | null;
};

export type FocusSessionCreate = {
  randomization_id: string;
  user_id: string;
  duration_seconds: number;
  started_at: Date;
  ends_at: Date;
};

export type FocusSessionCommand = {
  session_id: string;
  user_id: string;
};

export type FocusSessionStartCommand = {
  randomization_id: string;
  user_id: string;
  duration_seconds: number;
};

export type FocusSessionCreateResult =
  | { result: "created" | "existing"; session: FocusSessionRecord }
  | { result: "active_conflict" }
  | { result: "randomization_unavailable" };

export type FocusSessionFinish = FocusSessionCommand & {
  status: FocusTerminalStatus;
  finished_at: Date;
  expected_updated_at?: Date;
};
