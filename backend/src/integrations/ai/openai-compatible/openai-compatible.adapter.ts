import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { Ai } from "../ai.contract";
import { createAiSdkAdapter } from "../ai-sdk/ai-sdk.adapter";

type OpenAiCompatibleAdapterInput = {
  provider_name: string;
  base_url: string;
  api_key: string;
  model: string;
  input_price_per_million: number;
  output_price_per_million: number;
  supports_structured_outputs: boolean;
  reasoning_effort: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  timeout_ms: number;
};

export function createOpenAiCompatibleAdapter(input: OpenAiCompatibleAdapterInput): Ai {
  const provider = createOpenAICompatible({
    name: input.provider_name,
    baseURL: input.base_url,
    apiKey: input.api_key,
    includeUsage: true,
    supportsStructuredOutputs: input.supports_structured_outputs,
  });

  return createAiSdkAdapter({
    provider_name: input.provider_name,
    model_name: input.model,
    model: provider(input.model),
    input_price_per_million: input.input_price_per_million,
    output_price_per_million: input.output_price_per_million,
    timeout_ms: input.timeout_ms,
    provider_options: {
      [providerOptionName(input.provider_name)]: {
        reasoningEffort: input.reasoning_effort,
      },
    },
  });
}

function providerOptionName(provider: string): string {
  return provider.replace(/[-_]+(.)/g, (_, character: string) => character.toUpperCase());
}
