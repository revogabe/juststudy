export const FEEDBACK_STATUSES = ["active", "pending", "completed", "failed", "expired"] as const;
export const FEEDBACK_RECORDING_SECONDS = 15 * 60;
export const FEEDBACK_UPLOAD_GRACE_SECONDS = 2 * 60;
export const FEEDBACK_INACTIVITY_SECONDS = 2 * 60;
export const FEEDBACK_MAX_AUDIO_BYTES = 32 * 1024 * 1024;
export const FEEDBACK_MIN_AUDIO_SECONDS = 3;
export const FEEDBACK_MAX_AUDIO_SECONDS = 15 * 60;
export const FEEDBACK_MAX_PROCESS_ATTEMPTS = 3;
export const FEEDBACK_RETRY_SECONDS = [10, 60, 300] as const;
export const FEEDBACK_WORKER_INTERVAL_MS = 2000;
export const FEEDBACK_LEASE_SECONDS = 3 * 60;
export const FEEDBACK_HISTORY_DEFAULT_LIMIT = 10;
export const FEEDBACK_HISTORY_MAX_LIMIT = 50;
export const FEEDBACK_SHADOW_MODES = ["decision", "llm", "hybrid"] as const;
export const FEEDBACK_SHADOW_LOOKBACK_HOURS = 24;
export const FEEDBACK_SHADOW_BATCH_SIZE = 1;

export const FEEDBACK_AUDIO_MEDIA_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
] as const;
