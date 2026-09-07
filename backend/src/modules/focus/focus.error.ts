import { problemError } from "@/infrastructure/http/problem";

export const focusError = {
  invalidDuration() {
    return problemError.create({
      status: 422,
      code: "FOCUS_DURATION_INVALID",
      title: "Focus duration invalid",
      detail: "Focus duration must be between 60 and 14400 seconds.",
    });
  },
  randomizationNotFound() {
    return problemError.create({
      status: 404,
      code: "FOCUS_RANDOMIZATION_NOT_FOUND",
      title: "Focus randomization not found",
      detail: "The requested randomization does not exist for this user.",
    });
  },
  randomizationUnavailable() {
    return problemError.create({
      status: 409,
      code: "FOCUS_RANDOMIZATION_UNAVAILABLE",
      title: "Focus randomization unavailable",
      detail: "The requested randomization cannot start a focus session.",
    });
  },
  activeSession() {
    return problemError.create({
      status: 409,
      code: "FOCUS_SESSION_ACTIVE",
      title: "Focus session already active",
      detail: "Finish or abandon the active focus session before starting another one.",
    });
  },
  sessionNotFound() {
    return problemError.create({
      status: 404,
      code: "FOCUS_SESSION_NOT_FOUND",
      title: "Focus session not found",
      detail: "The requested focus session does not exist for this user.",
    });
  },
  stateConflict() {
    return problemError.create({
      status: 409,
      code: "FOCUS_SESSION_STATE_CONFLICT",
      title: "Focus session state conflict",
      detail: "The focus session has already finished with a different status.",
    });
  },
};
