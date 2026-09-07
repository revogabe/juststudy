import {
  FOCUS_INACTIVITY_TIMEOUT_SECONDS,
  FOCUS_MAX_DURATION_SECONDS,
  FOCUS_MIN_DURATION_SECONDS,
} from "./focus.constant";
import type { FocusSessionRecord, FocusTerminalStatus } from "./focus.contract";
import { focusError } from "./focus.error";

function validateFocusDuration(durationSeconds: number): number {
  if (durationSeconds < FOCUS_MIN_DURATION_SECONDS || durationSeconds > FOCUS_MAX_DURATION_SECONDS)
    throw focusError.invalidDuration();

  return durationSeconds;
}

function resolveFocusDeadline(session: FocusSessionRecord, now: Date): FocusTerminalStatus | null {
  if (session.status !== "active") return session.status;

  const inactiveAt = new Date(
    session.last_seen_at.getTime() + FOCUS_INACTIVITY_TIMEOUT_SECONDS * 1000,
  );

  if (session.ends_at <= inactiveAt && session.ends_at <= now) return "completed";
  if (inactiveAt <= now) return "abandoned";

  return null;
}

export const focusDurationRule = {
  validate: validateFocusDuration,
};

export const focusDeadlineRule = {
  resolve: resolveFocusDeadline,
};
