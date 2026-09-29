import { problemError } from "@/infrastructure/http/problem";

export const feedbackError = {
  subscriptionRequired() {
    return problemError.create({
      status: 403,
      code: "FEEDBACK_SUBSCRIPTION_REQUIRED",
      title: "Student subscription required",
      detail: "An active student subscription is required to submit an explanation.",
    });
  },
  focusUnavailable() {
    return problemError.create({
      status: 409,
      code: "FEEDBACK_FOCUS_UNAVAILABLE",
      title: "Focus session unavailable",
      detail: "Feedback can start only after the owned focus session is completed.",
    });
  },
  contextUnavailable() {
    return problemError.create({
      status: 422,
      code: "FEEDBACK_CONTEXT_UNAVAILABLE",
      title: "Assessment context unavailable",
      detail: "The selected topic does not have an assessment context.",
    });
  },
  activeSession() {
    return problemError.create({
      status: 409,
      code: "FEEDBACK_SESSION_ACTIVE",
      title: "Feedback session already active",
      detail: "Finish or let the active feedback session expire before starting another one.",
    });
  },
  sessionNotFound() {
    return problemError.create({
      status: 404,
      code: "FEEDBACK_SESSION_NOT_FOUND",
      title: "Feedback session not found",
      detail: "The feedback session does not exist for this user.",
    });
  },
  stateConflict() {
    return problemError.create({
      status: 409,
      code: "FEEDBACK_SESSION_STATE_CONFLICT",
      title: "Feedback session state conflict",
      detail: "The feedback session cannot perform this operation in its current state.",
    });
  },
  expired() {
    return problemError.create({
      status: 409,
      code: "FEEDBACK_SESSION_EXPIRED",
      title: "Feedback session expired",
      detail: "The recording or upload deadline has expired. Start a new feedback session.",
    });
  },
  audioInvalid(detail: string) {
    return problemError.create({
      status: 422,
      code: "FEEDBACK_AUDIO_INVALID",
      title: "Audio invalid",
      detail,
    });
  },
  transcriptionUnavailable() {
    return problemError.create({
      status: 503,
      code: "FEEDBACK_TRANSCRIPTION_UNAVAILABLE",
      title: "Transcription unavailable",
      detail: "The audio could not be transcribed right now. Try submitting it again.",
    });
  },
};
