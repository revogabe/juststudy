export type TextPromptInput = {
  name: string;
  label: string;
  fallback: string;
  fallback_version: string;
  variables: Record<string, string>;
};

export type TextPrompt = {
  text: string;
  version: string;
};

export type Prompts = {
  text: {
    get(input: TextPromptInput): Promise<TextPrompt>;
  };
};
