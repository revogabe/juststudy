import { z } from "zod";
import { knowledgeAssessmentRule } from "@/modules/knowledge/knowledge-assessment.rule";

const verdictSchema = z.enum(["correct", "mostly_correct", "partial", "incorrect", "insufficient"]);

const evaluationCaseSchema = z.object({
  id: z.string(),
  archetype: z.string().default("unlabeled"),
  context: z.object({
    subject: z.object({ slug: z.string(), name: z.string() }),
    topic: z.object({
      slug: z.string(),
      name: z.string(),
      level: z.enum(["beginner", "intermediate", "advanced", "specialist"]),
    }),
    assessment: z.object({
      reference_summary: z.string(),
      key_concepts: z.array(z.string()),
      common_misconceptions: z.array(z.string()),
      version: z.string(),
    }),
  }),
  transcript: z.object({
    text: z.string(),
    language: z.string(),
    language_probability: z.number(),
    duration_seconds: z.number(),
    model: z.string(),
    segments: z.array(
      z.object({
        id: z.string(),
        start_ms: z.number().int(),
        end_ms: z.number().int(),
        text: z.string(),
      }),
    ),
  }),
  expected: z.object({
    scorable: z.boolean(),
    mastery_min: z.number().int().min(0).max(100).optional(),
    mastery_max: z.number().int().min(0).max(100).optional(),
    verdicts: z.array(verdictSchema),
    required_correction_segment_ids: z.array(z.string()),
  }),
});

const evaluationDatasetSchema = z.object({ cases: z.array(evaluationCaseSchema).min(1) });
const generatedReferenceSchema = z.object({
  model: z.string(),
  prompt_version: z.string(),
  references: z.record(z.string(), evaluationCaseSchema.shape.context.shape.assessment),
});

export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type EvaluationReference = "authored" | "catalog-template" | "generated";

export type EvaluationOutcome = {
  scorable: boolean;
  verdict: z.infer<typeof verdictSchema>;
  mastery: number | null;
  correction_segment_ids: string[];
  segment_probabilities: Record<string, number>;
};

export type EvaluationRun = {
  case_id: string;
  archetype: string;
  repetition: number;
  passed: boolean;
  failed_to_generate: boolean;
  failures: string[];
  model: string | null;
  scorable: boolean | null;
  mastery: number | null;
  verdict: string | null;
  correction_segment_ids: string[];
  rubric: Record<string, number> | null;
  segments: { true_positive: number; false_positive: number; false_negative: number; true_negative: number; brier_sum: number };
  confidence: number | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
};

const EMPTY_SEGMENTS = { true_positive: 0, false_positive: 0, false_negative: 0, true_negative: 0, brier_sum: 0 };
const CONFIDENCE_THRESHOLDS = [0.5, 0.7, 0.8, 0.9];

export async function loadEvaluationCases(input: {
  dataset: string;
  case_id: string | undefined;
  reference: EvaluationReference;
}): Promise<EvaluationCase[]> {
  const dataset = evaluationDatasetSchema.parse(await Bun.file(new URL(`./fixtures/${input.dataset}.json`, import.meta.url)).json());
  const caseIds = new Set(input.case_id?.split(",").filter(Boolean));
  const cases = caseIds.size > 0 ? dataset.cases.filter((fixture) => caseIds.has(fixture.id)) : dataset.cases;

  if (cases.length === 0 || cases.length < caseIds.size) throw new Error(`Unknown benchmark case: ${input.case_id}`);
  if (input.reference === "authored") return cases;
  if (input.reference === "catalog-template") {
    return cases.map((fixture) => ({
      ...fixture,
      context: knowledgeAssessmentRule.create({ subject: fixture.context.subject, topic: fixture.context.topic }),
    }));
  }

  const generated = generatedReferenceSchema.parse(await Bun.file(generatedReferencePath(input.dataset)).json());

  return cases.map((fixture) => {
    const assessment = generated.references[`${fixture.context.subject.slug}/${fixture.context.topic.slug}`];
    if (!assessment) throw new Error(`No generated reference for ${fixture.id}. Run benchmarks/reference.generate.ts first.`);

    return { ...fixture, context: { ...fixture.context, assessment } };
  });
}

export function generatedReferencePath(dataset: string): URL {
  return new URL(`./fixtures/${dataset}-generated-references.json`, import.meta.url);
}

export function parseEvaluationReference(value: string | undefined): EvaluationReference {
  if (value === undefined || value === "" || value === "authored") return "authored";
  if (value === "catalog-template" || value === "generated") return value;

  throw new Error("The benchmark reference must be authored, catalog-template, or generated.");
}

export function evaluateOutcome(fixture: EvaluationCase, outcome: EvaluationOutcome): Pick<EvaluationRun, "failures" | "segments"> {
  const expected = fixture.expected;
  const failures: string[] = [];

  if (outcome.scorable !== expected.scorable) failures.push(`expected scorable=${expected.scorable}, received ${outcome.scorable}`);
  if (!expected.verdicts.includes(outcome.verdict)) failures.push(`unexpected verdict ${outcome.verdict}`);
  if (expected.mastery_min !== undefined && (outcome.mastery ?? -1) < expected.mastery_min)
    failures.push(`mastery ${outcome.mastery} is below ${expected.mastery_min}`);
  if (expected.mastery_max !== undefined && (outcome.mastery ?? 101) > expected.mastery_max)
    failures.push(`mastery ${outcome.mastery} is above ${expected.mastery_max}`);

  const flagged = new Set(outcome.correction_segment_ids);
  const required = new Set(expected.required_correction_segment_ids);
  const segments = { ...EMPTY_SEGMENTS };

  for (const segment of fixture.transcript.segments) {
    const isRequired = required.has(segment.id);
    const isFlagged = flagged.has(segment.id);
    const probability = outcome.segment_probabilities[segment.id] ?? (isFlagged ? 1 : 0);

    if (isRequired && !isFlagged) failures.push(`missing required correction for ${segment.id}`);
    if (isRequired && isFlagged) segments.true_positive += 1;
    if (isRequired && !isFlagged) segments.false_negative += 1;
    if (!isRequired && isFlagged) segments.false_positive += 1;
    if (!isRequired && !isFlagged) segments.true_negative += 1;
    segments.brier_sum += (probability - (isRequired ? 1 : 0)) ** 2;
  }

  return { failures, segments };
}

export function failedRun(fixture: EvaluationCase, repetition: number, error: unknown, model: string | null): EvaluationRun {
  return {
    case_id: fixture.id,
    archetype: fixture.archetype,
    repetition,
    passed: false,
    failed_to_generate: true,
    failures: [error instanceof Error ? error.message : "unknown benchmark error"],
    model,
    scorable: null,
    mastery: null,
    verdict: null,
    correction_segment_ids: [],
    rubric: null,
    segments: { ...EMPTY_SEGMENTS },
    confidence: null,
    latency_ms: null,
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    estimated_cost_usd: null,
  };
}

export function summarizeEvaluationRuns(runs: EvaluationRun[], fixtures: EvaluationCase[]) {
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const completed = runs.filter((run) => !run.failed_to_generate);
  const segments = { ...EMPTY_SEGMENTS };
  const archetypes = new Map<string, { passed: number; total: number }>();
  let scorableHits = 0;
  let verdictHits = 0;
  let masteryHits = 0;
  let masteryChecks = 0;
  let falsePasses = 0;
  let casesWithErrors = 0;

  for (const run of runs) {
    const fixture = fixturesById.get(run.case_id);
    if (!fixture) continue;

    const archetype = archetypes.get(run.archetype) ?? { passed: 0, total: 0 };
    archetype.total += 1;
    if (run.passed) archetype.passed += 1;
    archetypes.set(run.archetype, archetype);

    if (run.failed_to_generate) continue;

    segments.true_positive += run.segments.true_positive;
    segments.false_positive += run.segments.false_positive;
    segments.false_negative += run.segments.false_negative;
    segments.true_negative += run.segments.true_negative;
    segments.brier_sum += run.segments.brier_sum;
    if (run.scorable === fixture.expected.scorable) scorableHits += 1;
    if (run.verdict !== null && fixture.expected.verdicts.some((verdict) => verdict === run.verdict)) verdictHits += 1;
    if (fixture.expected.mastery_min !== undefined || fixture.expected.mastery_max !== undefined) {
      masteryChecks += 1;
      const mastery = run.mastery ?? -1;
      if (mastery >= (fixture.expected.mastery_min ?? 0) && mastery <= (fixture.expected.mastery_max ?? 100)) masteryHits += 1;
    }
    if (fixture.expected.required_correction_segment_ids.length > 0) {
      casesWithErrors += 1;
      if (run.verdict === "correct" || run.verdict === "mostly_correct") falsePasses += 1;
    }
  }

  const segmentCount = segments.true_positive + segments.false_positive + segments.false_negative + segments.true_negative;
  const latencies = runs.flatMap((run) => (run.latency_ms === null ? [] : [run.latency_ms])).toSorted((left, right) => left - right);
  const cost = sum(runs.flatMap((run) => (run.estimated_cost_usd === null ? [] : [run.estimated_cost_usd])));
  const confidenceRuns = completed.filter((run) => run.confidence !== null);

  return {
    passed_runs: runs.filter((run) => run.passed).length,
    total_runs: runs.length,
    pass_rate: ratio(runs.filter((run) => run.passed).length, runs.length),
    strict_pass_rate: ratio(runs.filter((run) => run.passed && run.segments.false_positive === 0).length, runs.length),
    generation_failure_rate: ratio(runs.length - completed.length, runs.length),
    scorable_accuracy: ratio(scorableHits, completed.length),
    verdict_accuracy: ratio(verdictHits, completed.length),
    mastery_in_range_rate: ratio(masteryHits, masteryChecks),
    false_pass_rate: ratio(falsePasses, casesWithErrors),
    correction_recall: ratio(segments.true_positive, segments.true_positive + segments.false_negative),
    correction_precision: ratio(segments.true_positive, segments.true_positive + segments.false_positive),
    false_correction_rate: ratio(segments.false_positive, segments.false_positive + segments.true_negative),
    segment_brier: ratio(segments.brier_sum, segmentCount),
    by_archetype: Object.fromEntries(
      [...archetypes.entries()]
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([name, counts]) => [name, { pass_rate: ratio(counts.passed, counts.total), runs: counts.total }]),
    ),
    confidence_routing:
      confidenceRuns.length === 0
        ? null
        : CONFIDENCE_THRESHOLDS.map((threshold) => {
            const automated = confidenceRuns.filter((run) => (run.confidence ?? 0) >= threshold);

            return {
              threshold,
              automated_share: ratio(automated.length, confidenceRuns.length),
              automated_pass_rate: ratio(automated.filter((run) => run.passed).length, automated.length),
            };
          }),
    p50_latency_ms: percentile(latencies, 0.5),
    p95_latency_ms: percentile(latencies, 0.95),
    input_tokens: sum(runs.flatMap((run) => (run.input_tokens === null ? [] : [run.input_tokens]))),
    output_tokens: sum(runs.flatMap((run) => (run.output_tokens === null ? [] : [run.output_tokens]))),
    estimated_cost_usd: cost,
    estimated_cost_per_1000_usd: completed.length === 0 ? null : (cost / completed.length) * 1000,
  };
}

export async function runPool<Item, Result>(items: Item[], parallelism: number, work: (item: Item) => Promise<Result>): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) continue;

      results[index] = await work(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallelism, items.length) }, worker));

  return results;
}

export function positiveInteger(name: string, value: string | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new Error(`${name} must be an integer from 1 through ${max}.`);

  return parsed;
}

export function percentile(values: number[], share: number): number | null {
  if (values.length === 0) return null;

  return values[Math.min(values.length - 1, Math.floor(values.length * share))] ?? null;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}
