import { generateText, Output } from "ai";
import type { Ai, AiStructuredGeneration, AiStructuredResult } from "../ai.contract";

export type AiSdkAdapterInput = {
  provider_name: string;
  model_name: string;
  model: Parameters<typeof generateText>[0]["model"];
  input_price_per_million: number;
  output_price_per_million: number;
  timeout_ms: number;
  provider_options?: Parameters<typeof generateText>[0]["providerOptions"];
};

type ModelPrice = { input_per_million: number; output_per_million: number };

export function createAiSdkAdapter(input: AiSdkAdapterInput): Ai {
  return {
    structured: {
      async create<Output>(generation: AiStructuredGeneration<Output>): Promise<AiStructuredResult<Output>> {
        return generate({
          generation,
          provider: input.provider_name,
          model_name: input.model_name,
          model: input.model,
          price: {
            input_per_million: input.input_price_per_million,
            output_per_million: input.output_price_per_million,
          },
          timeout_ms: input.timeout_ms,
          provider_options: input.provider_options,
        });
      },
    },
  };
}

async function generate<OutputType>(input: {
  generation: AiStructuredGeneration<OutputType>;
  provider: string;
  model_name: string;
  model: Parameters<typeof generateText>[0]["model"];
  price: ModelPrice;
  timeout_ms: number;
  provider_options?: Parameters<typeof generateText>[0]["providerOptions"];
}): Promise<AiStructuredResult<OutputType>> {
  const startedAt = performance.now();
  const runtimeContext = {
    ...input.generation.telemetry,
    ai_provider: input.provider,
    ai_model: input.model_name,
  };
  const includeRuntimeContext = Object.fromEntries(Object.keys(runtimeContext).map((key) => [key, true]));
  const result = await generateText({
    model: input.model,
    system: input.generation.system,
    prompt: input.generation.prompt,
    output: Output.object<OutputType>(input.generation.output),
    temperature: input.generation.temperature,
    maxOutputTokens: input.generation.max_output_tokens,
    maxRetries: 0,
    timeout: input.timeout_ms,
    ...(input.provider_options ? { providerOptions: input.provider_options } : {}),
    runtimeContext,
    telemetry: {
      isEnabled: true,
      recordInputs: false,
      recordOutputs: false,
      functionId: input.generation.function_id,
      includeRuntimeContext,
    },
  });
  const inputTokens = result.usage.inputTokens ?? 0;
  const outputTokens = result.usage.outputTokens ?? 0;

  return {
    output: result.output,
    provider: input.provider,
    model: input.model_name,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: result.usage.totalTokens ?? inputTokens + outputTokens,
    estimated_cost_usd: (inputTokens * input.price.input_per_million + outputTokens * input.price.output_per_million) / 1_000_000,
    latency_ms: Math.round(performance.now() - startedAt),
  };
}
