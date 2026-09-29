export type TranscriptionAudio = {
  bytes: Uint8Array;
  filename: string;
  media_type: string;
};

export type TranscriptSegment = {
  id: string;
  start_ms: number;
  end_ms: number;
  text: string;
};

export type Transcript = {
  text: string;
  language: string;
  language_probability: number;
  duration_seconds: number;
  model: string;
  segments: TranscriptSegment[];
};

export class TranscriptionUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("The transcription service is unavailable", { cause });
    this.name = "TranscriptionUnavailableError";
  }
}

export class AudioUnusableError extends Error {
  constructor(cause?: unknown) {
    super("The audio could not be transcribed", { cause });
    this.name = "AudioUnusableError";
  }
}

export type Transcription = {
  transcript: {
    create(audio: TranscriptionAudio): Promise<Transcript>;
  };
};
