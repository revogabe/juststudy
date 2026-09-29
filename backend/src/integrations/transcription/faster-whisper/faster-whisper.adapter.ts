import { z } from "zod";
import { AudioUnusableError, type Transcript, type Transcription, TranscriptionUnavailableError } from "../transcription.contract";

type FasterWhisperAdapterInput = {
  base_url: string;
  timeout_ms: number;
};

const responseSchema = z.object({
  text: z.string(),
  language: z.string().min(1),
  language_probability: z.number().min(0).max(1),
  duration_seconds: z.number().nonnegative(),
  model: z.string().min(1),
  segments: z.array(
    z.object({
      id: z.string(),
      start_ms: z.number().int().nonnegative(),
      end_ms: z.number().int().nonnegative(),
      text: z.string(),
    }),
  ),
});

export function createFasterWhisperAdapter(input: FasterWhisperAdapterInput): Transcription {
  return {
    transcript: {
      async create(audio): Promise<Transcript> {
        const body = new FormData();

        body.set("audio", new Blob([Uint8Array.from(audio.bytes)], { type: audio.media_type }), audio.filename);

        try {
          const response = await fetch(`${input.base_url}/v1/transcriptions`, {
            method: "POST",
            body,
            signal: AbortSignal.timeout(input.timeout_ms),
          });

          if (response.status === 422) throw new AudioUnusableError();
          if (!response.ok) throw new TranscriptionUnavailableError();

          return responseSchema.parse(await response.json());
        } catch (error) {
          if (error instanceof AudioUnusableError) throw error;
          if (error instanceof TranscriptionUnavailableError) throw error;

          throw new TranscriptionUnavailableError(error);
        }
      },
    },
  };
}
