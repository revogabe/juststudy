import { createOpenAiCompatibleAdapter } from "@/integrations/ai";
import { createLangfusePrompts } from "@/integrations/prompts";
import { createKnowledgeAssessmentService } from "@/modules/knowledge/knowledge-assessment.service";
import { generatedReferencePath, loadEvaluationCases, positiveInteger, runPool } from "./evaluation.fixture";

const datasetVersion = process.env.EVALUATION_BENCHMARK_DATASET ?? "evaluation-v2";
const parallelism = positiveInteger("REFERENCE_GENERATION_PARALLELISM", process.env.REFERENCE_GENERATION_PARALLELISM, 4, 16);
const model = process.env.AI_EVALUATION_MODEL ?? "qwen3.5:9b";
const fixtures = await loadEvaluationCases({ dataset: datasetVersion, case_id: undefined, reference: "authored" });
const writer = createKnowledgeAssessmentService({
  ai: createOpenAiCompatibleAdapter({
    provider_name: process.env.AI_PROVIDER_NAME ?? "ollama",
    base_url: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/v1",
    api_key: process.env.AI_API_KEY ?? "ollama",
    model,
    input_price_per_million: Number(process.env.AI_INPUT_PRICE_PER_MILLION ?? 0),
    output_price_per_million: Number(process.env.AI_OUTPUT_PRICE_PER_MILLION ?? 0),
    supports_structured_outputs: (process.env.AI_SUPPORTS_STRUCTURED_OUTPUTS ?? "true") === "true",
    reasoning_effort: (process.env.AI_REASONING_EFFORT ?? "none") as "none" | "low" | "medium" | "high" | "xhigh" | "max",
    timeout_ms: Number(process.env.AI_TIMEOUT_MS ?? 600_000),
  }),
  prompts: createLangfusePrompts({
    public_key: process.env.LANGFUSE_PUBLIC_KEY ?? "",
    secret_key: process.env.LANGFUSE_SECRET_KEY ?? "",
    base_url: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  }),
});
const topics = [
  ...new Map(fixtures.map((fixture) => [`${fixture.context.subject.slug}/${fixture.context.topic.slug}`, fixture.context])).entries(),
];
const generated = await runPool(topics, parallelism, async ([key, topic]) => [key, await writer.assessment.create(topic)] as const);
const report = {
  model,
  prompt_version: generated[0]?.[1].prompt_version ?? "unknown",
  references: Object.fromEntries(generated.map(([key, result]) => [key, result.assessment])),
};

await Bun.write(generatedReferencePath(datasetVersion), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated ${generated.length} references with ${model}.`);
