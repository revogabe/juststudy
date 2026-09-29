import { createSystemOneAdapter } from "@/integrations/decisions";
import { createFeedbackDecisionService } from "@/modules/feedback";
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

const datasetVersion = process.env.DECISION_BENCHMARK_DATASET ?? "evaluation-v2";
const reference = parseEvaluationReference(process.env.DECISION_BENCHMARK_REFERENCE);
const repetitions = positiveInteger("DECISION_BENCHMARK_REPETITIONS", process.env.DECISION_BENCHMARK_REPETITIONS, 1, 20);
const parallelism = positiveInteger("DECISION_BENCHMARK_PARALLELISM", process.env.DECISION_BENCHMARK_PARALLELISM, 1, 64);
const caseId = process.env.DECISION_BENCHMARK_CASE;
const outputPath = process.env.DECISION_BENCHMARK_OUTPUT;
const providerName = process.env.DECISION_PROVIDER_NAME ?? "openrouter";
const model = process.env.DECISION_MODEL ?? "typesafe/jev-1.13";
const expectedModel = process.env.DECISION_BENCHMARK_EXPECTED_MODEL ?? model;

const fixtures = await loadEvaluationCases({ dataset: datasetVersion, case_id: caseId, reference });
const decisions = createSystemOneAdapter({
  provider_name: providerName,
  base_url: process.env.DECISION_BASE_URL ?? "https://openrouter.ai/api/v1",
  api_key: process.env.DECISION_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "",
  model,
  input_price_per_million: Number(process.env.DECISION_INPUT_PRICE_PER_MILLION ?? 0.042),
  timeout_ms: Number(process.env.DECISION_TIMEOUT_MS ?? 120_000),
});
const review = createFeedbackDecisionService({ decisions });
const attempts = fixtures.flatMap((fixture) => Array.from({ length: repetitions }, (_, index) => ({ fixture, repetition: index + 1 })));

const runs = await runPool(attempts, parallelism, ({ fixture, repetition }) => runCase(fixture, repetition));
const report = {
  arm: "decision",
  dataset_version: datasetVersion,
  reference,
  requested_provider: providerName,
  requested_model: model,
  expected_model: expectedModel,
  selected_case: caseId ?? "all",
  repetitions,
  parallelism,
  ...summarizeEvaluationRuns(runs, fixtures),
  runs,
};

console.log(JSON.stringify(report, null, 2));
if (outputPath) await Bun.write(outputPath, JSON.stringify(report, null, 2));

if (report.pass_rate !== 1) throw new Error("One or more decision benchmark gates failed.");

async function runCase(fixture: EvaluationCase, repetition: number): Promise<EvaluationRun> {
  try {
    const result = await review.explanation.create({
      feedback_session_id: `benchmark:${fixture.id}:${repetition}`,
      context: fixture.context,
      transcript: fixture.transcript,
    });
    const decision = result.decision;
    const outcome = evaluateOutcome(fixture, {
      scorable: decision.scorable,
      verdict: decision.verdict,
      mastery: decision.mastery,
      correction_segment_ids: decision.correction_segment_ids,
      segment_probabilities: Object.fromEntries(
        decision.segments.map((segment) => [segment.segment_id, segment.contradiction_probability]),
      ),
    });
    if (!result.model.startsWith(expectedModel)) outcome.failures.unshift(`expected model ${expectedModel}, received ${result.model}`);

    return {
      case_id: fixture.id,
      archetype: fixture.archetype,
      repetition,
      passed: outcome.failures.length === 0,
      failed_to_generate: false,
      failures: outcome.failures,
      model: result.model,
      scorable: decision.scorable,
      mastery: decision.mastery,
      verdict: decision.verdict,
      correction_segment_ids: decision.correction_segment_ids,
      rubric: Object.fromEntries(Object.entries(decision.rubric).map(([name, criterion]) => [name, criterion.score])),
      segments: outcome.segments,
      confidence: decision.confidence,
      latency_ms: result.latency_ms,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.input_tokens + result.output_tokens,
      estimated_cost_usd: result.estimated_cost_usd,
    };
  } catch (error) {
    return failedRun(fixture, repetition, error, null);
  }
}
