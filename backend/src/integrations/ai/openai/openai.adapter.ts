import { createOpenAI } from "@ai-sdk/openai";
import type { Ai } from "../ai.contract";
import { createAiSdkAdapter } from "../ai-sdk/ai-sdk.adapter";

type OpenAiAdapterInput = {
  api_key: string;
  base_url: string;
  model: string;
  input_price_per_million: number;
  output_price_per_million: number;
  reasoning_effort: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  timeout_ms: number;
};

export function createOpenAiAdapter(input: OpenAiAdapterInput): Ai {
  const provider = createOpenAI({
    apiKey: input.api_key,
    baseURL: input.base_url,
  });

  return createAiSdkAdapter({
    provider_name: "openai",
    model_name: input.model,
    model: provider.responses(input.model),
    input_price_per_million: input.input_price_per_million,
    output_price_per_million: input.output_price_per_million,
    timeout_ms: input.timeout_ms,
    provider_options: {
      openai: {
        reasoningEffort: input.reasoning_effort,
      },
    },
  });
}
