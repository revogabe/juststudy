import type { ZodType } from "zod";

export type AiTelemetryValue = string | number | boolean;

export type AiStructuredGeneration<Output> = {
  system: string;
  prompt: string;
  output: {
    schema: ZodType<Output>;
    name: string;
    description: string;
  };
  temperature: number;
  max_output_tokens: number;
  function_id: string;
  telemetry: Record<string, AiTelemetryValue>;
};

export type AiStructuredResult<Output> = {
  output: Output;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
};

export type Ai = {
  structured: {
    create<Output>(input: AiStructuredGeneration<Output>): Promise<AiStructuredResult<Output>>;
  };
};
