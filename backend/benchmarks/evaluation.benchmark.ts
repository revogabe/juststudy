import { NoObjectGeneratedError } from "ai";
import { createOpenAiCompatibleAdapter } from "@/integrations/ai";
import { createSystemOneAdapter } from "@/integrations/decisions";
import { createLangfuseObservability } from "@/integrations/observability";
import { createLangfusePrompts } from "@/integrations/prompts";
import { createFeedbackDecisionService, createFeedbackHybridReviewService, createFeedbackReviewService } from "@/modules/feedback";
import { feedbackEvaluationRule } from "@/modules/feedback/feedback.rule";
import {
  type EvaluationCase,
  type EvaluationRun,
  evaluateOutcome,
  failedRun,
  loadEvaluationCases,
  parseEvaluationReference,
  positiveInteger,
  runPool,
  summarizeEvaluationRuns,
} from "./evaluation.fixture";

const datasetVersion = process.env.EVALUATION_BENCHMARK_DATASET ?? "evaluation-v1";
const reviewMode = process.env.EVALUATION_BENCHMARK_REVIEW ?? "llm";
const reference = parseEvaluationReference(process.env.EVALUATION_BENCHMARK_REFERENCE);
const repetitions = positiveInteger("EVALUATION_BENCHMARK_REPETITIONS", process.env.EVALUATION_BENCHMARK_REPETITIONS, 3, 20);
const parallelism = positiveInteger("EVALUATION_BENCHMARK_PARALLELISM", process.env.EVALUATION_BENCHMARK_PARALLELISM, 1, 32);
const caseId = process.env.EVALUATION_BENCHMARK_CASE;
const outputPath = process.env.EVALUATION_BENCHMARK_OUTPUT;
const providerName = process.env.AI_PROVIDER_NAME ?? "ollama";
const model = process.env.AI_EVALUATION_MODEL ?? "qwen3.5:9b";
const inputPricePerMillion = Number(process.env.AI_INPUT_PRICE_PER_MILLION ?? 0);
const outputPricePerMillion = Number(process.env.AI_OUTPUT_PRICE_PER_MILLION ?? 0);
const expectedModel = process.env.EVALUATION_BENCHMARK_EXPECTED_MODEL ?? model;
const infraHourlyUsd = optionalNumber(process.env.EVALUATION_BENCHMARK_INFRA_HOURLY_USD);
const utilization = Number(process.env.EVALUATION_BENCHMARK_UTILIZATION ?? 0.7);
const concurrency = Number(process.env.EVALUATION_BENCHMARK_CONCURRENCY ?? 1);

if (reviewMode !== "llm" && reviewMode !== "hybrid") throw new Error("EVALUATION_BENCHMARK_REVIEW must be llm or hybrid.");
if (!(utilization > 0 && utilization <= 1)) throw new Error("EVALUATION_BENCHMARK_UTILIZATION must be greater than zero and at most one.");
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("EVALUATION_BENCHMARK_CONCURRENCY must be a positive integer.");

const fixtures = await loadEvaluationCases({ dataset: datasetVersion, case_id: caseId, reference });
const ai = createOpenAiCompatibleAdapter({
  provider_name: providerName,
  base_url: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/v1",
  api_key: process.env.AI_API_KEY ?? "ollama",
  model,
  input_price_per_million: inputPricePerMillion,
  output_price_per_million: outputPricePerMillion,
  supports_structured_outputs: (process.env.AI_SUPPORTS_STRUCTURED_OUTPUTS ?? "true") === "true",
  reasoning_effort: (process.env.AI_REASONING_EFFORT ?? "none") as "none" | "low" | "medium" | "high" | "xhigh" | "max",
  timeout_ms: Number(process.env.AI_TIMEOUT_MS ?? 600_000),
});
const langfuseInput = {
  public_key: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  secret_key: process.env.LANGFUSE_SECRET_KEY ?? "",
  base_url: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
};
const prompts = createLangfusePrompts(langfuseInput);
const observability = createLangfuseObservability({
  ...langfuseInput,
  environment: process.env.APP_ENV ?? "development",
});
const llmReview = createFeedbackReviewService({ ai, prompts });
const review =
  reviewMode === "hybrid"
    ? createFeedbackHybridReviewService({
        decision: createFeedbackDecisionService({
          decisions: createSystemOneAdapter({
            provider_name: process.env.DECISION_PROVIDER_NAME ?? "openrouter",
            base_url: process.env.DECISION_BASE_URL ?? "https://openrouter.ai/api/v1",
            api_key: process.env.DECISION_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "",
            model: process.env.DECISION_MODEL ?? "typesafe/jev-1.13",
            input_price_per_million: Number(process.env.DECISION_INPUT_PRICE_PER_MILLION ?? 0.042),
            timeout_ms: Number(process.env.DECISION_TIMEOUT_MS ?? 30_000),
          }),
        }),
        ai,
        prompts,
        fallback: llmReview,
      })
    : llmReview;
const attempts = fixtures.flatMap((fixture) => Array.from({ length: repetitions }, (_, index) => ({ fixture, repetition: index + 1 })));
const promptVersions = new Set<string>();

const runs = await runPool(attempts, parallelism, ({ fixture, repetition }) => runCase(fixture, repetition));
const summary = summarizeEvaluationRuns(runs, fixtures);
const latencies = runs.flatMap((run) => (run.latency_ms === null ? [] : [run.latency_ms]));
const capacityPerHour = summary.p50_latency_ms === null ? null : (3_600_000 * concurrency * utilization) / summary.p50_latency_ms;
const measuredLatencyMs = latencies.reduce((total, latency) => total + latency, 0);
const report = {
  arm: reviewMode,
  dataset_version: datasetVersion,
  reference,
  requested_provider: providerName,
  requested_model: model,
  expected_model: expectedModel,
  prompt_versions: [...promptVersions],
  selected_case: caseId ?? "all",
  repetitions,
  parallelism,
  ...summary,
  benchmark_concurrency: concurrency,
  target_utilization: utilization,
  estimated_capacity_per_hour: capacityPerHour,
  infra_hourly_usd: infraHourlyUsd,
  estimated_infra_cost_per_evaluation_usd: infraHourlyUsd === null || capacityPerHour === null ? null : infraHourlyUsd / capacityPerHour,
  estimated_infra_cost_per_1000_evaluations_usd:
    infraHourlyUsd === null || capacityPerHour === null ? null : (infraHourlyUsd / capacityPerHour) * 1000,
  measured_output_tokens_per_second: measuredLatencyMs === 0 ? null : summary.output_tokens / (measuredLatencyMs / 1000),
  total_tokens: summary.input_tokens + summary.output_tokens,
  runs,
};

console.log(JSON.stringify(report, null, 2));
if (outputPath) await Bun.write(outputPath, JSON.stringify(report, null, 2));
await observability.shutdown();

if (report.pass_rate !== 1) throw new Error("One or more live evaluation benchmark gates failed.");

async function runCase(fixture: EvaluationCase, repetition: number): Promise<EvaluationRun> {
  const startedAt = performance.now();

  try {
    const result = await review.explanation.create({
      feedback_session_id: `benchmark:${fixture.id}:${repetition}`,
      context: fixture.context,
      transcript: fixture.transcript,
    });
    promptVersions.add(result.prompt_version);
    const evaluation = feedbackEvaluationRule.create(result.evaluation, fixture.transcript);
    const outcome = evaluateOutcome(fixture, {
      scorable: evaluation.scorable,
      verdict: evaluation.verdict,
      mastery: evaluation.mastery,
      correction_segment_ids: evaluation.corrections.map((correction) => correction.segment_id),
      segment_probabilities: {},
    });
    const modelMatches = reviewMode === "hybrid" ? result.model.endsWith(`+${expectedModel}`) : result.model === expectedModel;
    if (!modelMatches) outcome.failures.unshift(`expected model ${expectedModel}, received ${result.model}`);

    return {
      case_id: fixture.id,
      archetype: fixture.archetype,
      repetition,
      passed: outcome.failures.length === 0,
      failed_to_generate: false,
      failures: outcome.failures,
      model: result.model,
      scorable: evaluation.scorable,
      mastery: evaluation.mastery,
      verdict: evaluation.verdict,
      correction_segment_ids: evaluation.corrections.map((correction) => correction.segment_id),
      rubric: Object.fromEntries(Object.entries(evaluation.rubric).map(([name, criterion]) => [name, criterion.score])),
      segments: outcome.segments,
      confidence: null,
      latency_ms: result.latency_ms,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.total_tokens,
      estimated_cost_usd: result.estimated_cost_usd,
    };
  } catch (error) {
    const generationFailure = NoObjectGeneratedError.isInstance(error) ? error : null;
    const run = failedRun(fixture, repetition, error, generationFailure ? model : null);
    if (!generationFailure) return run;

    const inputTokens = generationFailure.usage?.inputTokens ?? 0;
    const outputTokens = generationFailure.usage?.outputTokens ?? 0;

    return {
      ...run,
      latency_ms: Math.round(performance.now() - startedAt),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: generationFailure.usage?.totalTokens ?? inputTokens + outputTokens,
      estimated_cost_usd: (inputTokens * inputPricePerMillion + outputTokens * outputPricePerMillion) / 1_000_000,
    };
  }
}

function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("EVALUATION_BENCHMARK_INFRA_HOURLY_USD must be a non-negative number.");

  return parsed;
}
