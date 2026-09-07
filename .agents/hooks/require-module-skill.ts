type PromptHookInput = {
  prompt?: unknown;
};

const MODULE_ACTION =
  /\b(create|add|implement|extend|refactor|change|criar|adicionar|implementar|estender|refatorar|alterar)\b/i;
const MODULE_TARGET = /\b(module|modules|modulo|modulos)\b/i;
const MODULE_PATH = "backend/src/modules/";
const SKILL_REMINDER = [
  "This request creates or substantially changes a backend module.",
  "Before editing, load and follow .agents/skills/create-backend-module/SKILL.md completely.",
  "Treat docs/architecture.md, docs/code-patterns.md, and docs/api.md as the source of truth.",
].join(" ");

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function shouldLoadModuleSkill(prompt: string): boolean {
  const normalizedPrompt = normalize(prompt);

  if (normalizedPrompt.includes(MODULE_PATH)) return true;
  if (!MODULE_ACTION.test(normalizedPrompt)) return false;

  return MODULE_TARGET.test(normalizedPrompt);
}

function parseInput(value: string): PromptHookInput | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (parsed === null || typeof parsed !== "object") return null;

    return { prompt: Reflect.get(parsed, "prompt") };
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const input = parseInput(await Bun.stdin.text());

  if (!input) return;
  if (typeof input.prompt !== "string") return;
  if (!shouldLoadModuleSkill(input.prompt)) return;

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: SKILL_REMINDER,
      },
    }),
  );
}

await run();
