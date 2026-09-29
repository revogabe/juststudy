import { LangfuseClient } from "@langfuse/client";
import type { Prompts, TextPromptInput } from "../prompt.contract";

type LangfusePromptsInput = {
  public_key: string;
  secret_key: string;
  base_url: string;
};

export function createLangfusePrompts(input: LangfusePromptsInput): Prompts {
  const client =
    input.public_key && input.secret_key
      ? new LangfuseClient({
          publicKey: input.public_key,
          secretKey: input.secret_key,
          baseUrl: input.base_url,
        })
      : null;

  return {
    text: {
      async get(promptInput) {
        if (!client) return localPrompt(promptInput);

        const prompt = await client.prompt.get(promptInput.name, {
          type: "text",
          label: promptInput.label,
          cacheTtlSeconds: 60,
          fetchTimeoutMs: 2000,
          maxRetries: 0,
          fallback: promptInput.fallback,
        });

        return {
          text: prompt.compile(promptInput.variables),
          version: prompt.isFallback ? promptInput.fallback_version : String(prompt.version),
        };
      },
    },
  };
}

function localPrompt(input: TextPromptInput) {
  let text = input.fallback;

  for (const [name, value] of Object.entries(input.variables)) text = text.replaceAll(`{{${name}}}`, value);

  return { text, version: input.fallback_version };
}
