import { z } from "zod";
import { createOpenAiCompatibleAdapter } from "@/integrations/ai";
import { createSystemOneAdapter, type DecisionChoiceQuestion, type DecisionNoulQuestion } from "@/integrations/decisions";
import { KNOWLEDGE_LEVELS } from "@/modules/knowledge/knowledge.constant";
import type { KnowledgeLevel } from "@/modules/knowledge/knowledge.contract";
import { percentile, positiveInteger, runPool, sum } from "./evaluation.fixture";

const LEVEL_DEFINITIONS: Record<KnowledgeLevel, string> = {
  beginner: "Foundational idea usually met first in ensino fundamental or at first contact with the subject; few prerequisites",
  intermediate: "Standard ensino médio or vestibular content that builds on beginner ideas",
  advanced: "Undergraduate-course depth that needs several prerequisites or formal methods",
  specialist: "Graduate, professional, or research-level topic, or a narrow specialization",
};
const NO_DUPLICATE = "none";

const topicSchema = z.object({ slug: z.string(), name: z.string(), level: z.enum(KNOWLEDGE_LEVELS) });
const candidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  expected_level: z.enum(KNOWLEDGE_LEVELS),
  duplicate_of: z.string().nullable(),
  in_scope: z.boolean(),
  kind: z.enum(["new", "duplicate", "out_of_scope"]),
});
const subjectSchema = z.object({
  slug: z.string(),
  name: z.string(),
  existing_topics: z.array(topicSchema),
  candidates: z.array(candidateSchema),
});
const datasetSchema = z.object({ subjects: z.array(subjectSchema).min(1) });
const llmJudgmentSchema = z.object({
  judgments: z.array(
    z.object({
      id: z.string().max(100),
      level: z.enum(KNOWLEDGE_LEVELS),
      duplicate_of: z.string().max(120).nullable(),
      in_scope: z.boolean(),
    }),
  ),
});

type TopicSubject = z.infer<typeof subjectSchema>;
type TopicCandidate = z.infer<typeof candidateSchema>;
type TopicJudgment = {
  candidate_id: string;
  level: KnowledgeLevel;
  duplicate_of: string | null;
  in_scope: boolean;
  confidence: number | null;
};
type TopicBatch = {
  subject_slug: string;
  judgments: TopicJudgment[];
  failed: boolean;
  failure: string | null;
  latency_ms: number;
  estimated_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
};

const arm = process.env.TOPIC_BENCHMARK_ARM ?? "decision";
const parallelism = positiveInteger("TOPIC_BENCHMARK_PARALLELISM", process.env.TOPIC_BENCHMARK_PARALLELISM, 8, 64);
const outputPath = process.env.TOPIC_BENCHMARK_OUTPUT;
const dataset = datasetSchema.parse(await Bun.file(new URL("./fixtures/topic-review-v1.json", import.meta.url)).json());

if (arm !== "decision" && arm !== "llm") throw new Error("TOPIC_BENCHMARK_ARM must be decision or llm.");

const startedAt = performance.now();
const batches = arm === "decision" ? await runDecisionArm(dataset.subjects) : await runLlmArm(dataset.subjects);
const wallClockMs = Math.round(performance.now() - startedAt);
const report = {
  arm,
  dataset_version: "topic-review-v1",
  requested_provider:
    arm === "decision" ? (process.env.DECISION_PROVIDER_NAME ?? "openrouter") : (process.env.AI_PROVIDER_NAME ?? "ollama"),
  requested_model:
    arm === "decision" ? (process.env.DECISION_MODEL ?? "typesafe/jev-1.13") : (process.env.AI_EVALUATION_MODEL ?? "qwen3.5:9b"),
  ...summarize(dataset.subjects, batches),
  wall_clock_ms: wallClockMs,
  batches,
};

console.log(JSON.stringify(report, null, 2));
if (outputPath) await Bun.write(outputPath, JSON.stringify(report, null, 2));

async function runDecisionArm(subjects: TopicSubject[]): Promise<TopicBatch[]> {
  const decisions = createSystemOneAdapter({
    provider_name: process.env.DECISION_PROVIDER_NAME ?? "openrouter",
    base_url: process.env.DECISION_BASE_URL ?? "https://openrouter.ai/api/v1",
    api_key: process.env.DECISION_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "",
    model: process.env.DECISION_MODEL ?? "typesafe/jev-1.13",
    input_price_per_million: Number(process.env.DECISION_INPUT_PRICE_PER_MILLION ?? 0.042),
    timeout_ms: Number(process.env.DECISION_TIMEOUT_MS ?? 120_000),
  });
  const work = subjects.flatMap((subject) => subject.candidates.map((candidate) => ({ subject, candidate })));
  const results = await runPool(work, parallelism, async ({ subject, candidate }) => {
    const candidateStartedAt = performance.now();

    try {
      const result = await decisions.answer.create({
        state: { subject: subject.name, candidate_topic: candidate.name },
        questions: topicQuestions(subject),
        function_id: "knowledge.topic.review",
      });
      const duplicate = result.answers.duplicate.choice;

      return {
        subject_slug: subject.slug,
        judgments: [
          {
            candidate_id: candidate.id,
            level: levelFor(result.answers.level.choice),
            duplicate_of: duplicate === NO_DUPLICATE ? null : duplicate,
            in_scope: result.answers.in_scope.probability >= 0.5,
            confidence: Math.min(
              result.answers.level.confidence,
              result.answers.duplicate.confidence,
              Math.abs(2 * result.answers.in_scope.probability - 1),
            ),
          },
        ],
        failed: false,
        failure: null,
        latency_ms: result.latency_ms,
        estimated_cost_usd: result.estimated_cost_usd,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
      };
    } catch (error) {
      return failedBatch(subject.slug, error, candidateStartedAt);
    }
  });

  return results;
}

async function runLlmArm(subjects: TopicSubject[]): Promise<TopicBatch[]> {
  const ai = createOpenAiCompatibleAdapter({
    provider_name: process.env.AI_PROVIDER_NAME ?? "ollama",
    base_url: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/v1",
    api_key: process.env.AI_API_KEY ?? "ollama",
    model: process.env.AI_EVALUATION_MODEL ?? "qwen3.5:9b",
    input_price_per_million: Number(process.env.AI_INPUT_PRICE_PER_MILLION ?? 0),
    output_price_per_million: Number(process.env.AI_OUTPUT_PRICE_PER_MILLION ?? 0),
    supports_structured_outputs: (process.env.AI_SUPPORTS_STRUCTURED_OUTPUTS ?? "true") === "true",
    reasoning_effort: (process.env.AI_REASONING_EFFORT ?? "none") as "none" | "low" | "medium" | "high" | "xhigh" | "max",
    timeout_ms: Number(process.env.AI_TIMEOUT_MS ?? 600_000),
  });

  return runPool(subjects, parallelism, async (subject) => {
    const subjectStartedAt = performance.now();

    try {
      const result = await ai.structured.create({
        system: `You curate a study-topic catalog. For each candidate topic decide its level, whether it duplicates an existing topic of the same subject (same concept, even if phrased differently or in another language), and whether it is an academic study topic that belongs to the subject. Level definitions: ${JSON.stringify(LEVEL_DEFINITIONS)}. Use duplicate_of = the existing topic slug, or null when the concept is genuinely new.`,
        prompt: JSON.stringify({
          subject: subject.name,
          existing_topics: subject.existing_topics,
          candidates: subject.candidates.map((candidate) => ({ id: candidate.id, name: candidate.name })),
        }),
        output: { schema: llmJudgmentSchema, name: "topic_review", description: "Catalog decisions for each candidate topic" },
        temperature: 0,
        max_output_tokens: 3000,
        function_id: "knowledge.topic.review",
        telemetry: { subject_slug: subject.slug },
      });

      return {
        subject_slug: subject.slug,
        judgments: result.output.judgments.map((judgment) => ({
          candidate_id: judgment.id,
          level: judgment.level,
          duplicate_of: judgment.duplicate_of,
          in_scope: judgment.in_scope,
          confidence: null,
        })),
        failed: false,
        failure: null,
        latency_ms: result.latency_ms,
        estimated_cost_usd: result.estimated_cost_usd,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
      };
    } catch (error) {
      return failedBatch(subject.slug, error, subjectStartedAt);
    }
  });
}

function topicQuestions(subject: TopicSubject): {
  level: DecisionChoiceQuestion;
  duplicate: DecisionChoiceQuestion;
  in_scope: DecisionNoulQuestion;
} {
  return {
    level: {
      type: "choice",
      instructions: `Which level best describes candidate_topic as a topic of ${subject.name}?`,
      criteria: LEVEL_DEFINITIONS,
    },
    duplicate: {
      type: "choice",
      instructions:
        "Which existing catalog topic covers the same concept as candidate_topic, even if it is phrased differently or in another language? Choose none when candidate_topic is a genuinely different concept, including a closely related one.",
      criteria: {
        [NO_DUPLICATE]: "No existing topic covers the same concept",
        ...Object.fromEntries(subject.existing_topics.map((topic) => [topic.slug, topic.name])),
      },
    },
    in_scope: {
      type: "noul",
      instructions: `Is candidate_topic an academic study topic that belongs to ${subject.name}?`,
      criteria: {
        true: `An academic topic of ${subject.name}`,
        false: "A topic of another subject, a non-academic subject, or a professional skill unrelated to the subject",
      },
    },
  };
}

function summarize(subjects: TopicSubject[], batches: TopicBatch[]) {
  const judgments = new Map(batches.flatMap((batch) => batch.judgments.map((judgment) => [judgment.candidate_id, judgment])));
  const counts = {
    candidates: 0,
    judged: 0,
    decisions_correct: 0,
    level_exact: 0,
    level_adjacent: 0,
    level_total: 0,
    duplicate_true_positive: 0,
    duplicate_false_positive: 0,
    duplicate_false_negative: 0,
    duplicate_slug_exact: 0,
    scope_correct: 0,
    accept_true_positive: 0,
    accept_false_positive: 0,
    accept_false_negative: 0,
    out_of_scope_caught: 0,
    out_of_scope_total: 0,
  };
  const confidenceRuns: Array<{ confidence: number; correct: boolean }> = [];

  for (const subject of subjects) {
    for (const candidate of subject.candidates) {
      counts.candidates += 1;
      const judgment = judgments.get(candidate.id);
      if (!judgment) continue;

      counts.judged += 1;
      const correct = scoreCandidate(candidate, judgment, counts);
      if (correct) counts.decisions_correct += 1;
      if (judgment.confidence !== null) confidenceRuns.push({ confidence: judgment.confidence, correct });
    }
  }

  const latencies = batches.map((batch) => batch.latency_ms).toSorted((left, right) => left - right);
  const cost = sum(batches.map((batch) => batch.estimated_cost_usd));

  return {
    candidates: counts.candidates,
    judged_share: ratio(counts.judged, counts.candidates),
    failed_requests: batches.filter((batch) => batch.failed).length,
    decision_accuracy: ratio(counts.decisions_correct, counts.judged),
    level_accuracy: ratio(counts.level_exact, counts.level_total),
    level_adjacent_accuracy: ratio(counts.level_adjacent, counts.level_total),
    duplicate_precision: ratio(counts.duplicate_true_positive, counts.duplicate_true_positive + counts.duplicate_false_positive),
    duplicate_recall: ratio(counts.duplicate_true_positive, counts.duplicate_true_positive + counts.duplicate_false_negative),
    duplicate_slug_accuracy: ratio(counts.duplicate_slug_exact, counts.duplicate_true_positive + counts.duplicate_false_negative),
    scope_accuracy: ratio(counts.scope_correct, counts.judged),
    out_of_scope_recall: ratio(counts.out_of_scope_caught, counts.out_of_scope_total),
    accept_precision: ratio(counts.accept_true_positive, counts.accept_true_positive + counts.accept_false_positive),
    accept_recall: ratio(counts.accept_true_positive, counts.accept_true_positive + counts.accept_false_negative),
    confidence_routing:
      confidenceRuns.length === 0
        ? null
        : [0.5, 0.7, 0.8, 0.9].map((threshold) => {
            const automated = confidenceRuns.filter((run) => run.confidence >= threshold);

            return {
              threshold,
              automated_share: ratio(automated.length, confidenceRuns.length),
              automated_accuracy: ratio(automated.filter((run) => run.correct).length, automated.length),
            };
          }),
    p50_request_latency_ms: percentile(latencies, 0.5),
    p95_request_latency_ms: percentile(latencies, 0.95),
    input_tokens: sum(batches.map((batch) => batch.input_tokens)),
    output_tokens: sum(batches.map((batch) => batch.output_tokens)),
    estimated_cost_usd: cost,
  };
}

function scoreCandidate(candidate: TopicCandidate, judgment: TopicJudgment, counts: Record<string, number>): boolean {
  const increment = (key: string) => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  const isDuplicate = candidate.duplicate_of !== null;
  const judgedDuplicate = judgment.duplicate_of !== null;
  const shouldAccept = candidate.kind === "new";
  const accepted = judgment.in_scope && !judgedDuplicate;
  const levelCorrect = judgment.level === candidate.expected_level;

  if (judgment.in_scope === candidate.in_scope) increment("scope_correct");
  if (!candidate.in_scope) {
    increment("out_of_scope_total");
    if (!judgment.in_scope) increment("out_of_scope_caught");
  }
  if (candidate.in_scope) {
    increment("level_total");
    if (levelCorrect) increment("level_exact");
    if (Math.abs(KNOWLEDGE_LEVELS.indexOf(judgment.level) - KNOWLEDGE_LEVELS.indexOf(candidate.expected_level)) <= 1)
      increment("level_adjacent");
  }
  if (isDuplicate && judgedDuplicate) increment("duplicate_true_positive");
  if (isDuplicate && judgedDuplicate && judgment.duplicate_of === candidate.duplicate_of) increment("duplicate_slug_exact");
  if (isDuplicate && !judgedDuplicate) increment("duplicate_false_negative");
  if (!isDuplicate && candidate.in_scope && judgedDuplicate) increment("duplicate_false_positive");
  if (shouldAccept && accepted) increment("accept_true_positive");
  if (!shouldAccept && accepted) increment("accept_false_positive");
  if (shouldAccept && !accepted) increment("accept_false_negative");

  const gateCorrect = accepted === shouldAccept && (!isDuplicate || judgment.duplicate_of === candidate.duplicate_of);

  return gateCorrect && (!shouldAccept || levelCorrect);
}

function levelFor(choice: string): KnowledgeLevel {
  const level = KNOWLEDGE_LEVELS.find((candidate) => candidate === choice);
  if (!level) throw new Error(`The decision provider returned an unknown level: ${choice}.`);

  return level;
}

function failedBatch(subjectSlug: string, error: unknown, startedAt: number): TopicBatch {
  return {
    subject_slug: subjectSlug,
    judgments: [],
    failed: true,
    failure: error instanceof Error ? error.message : "unknown topic benchmark error",
    latency_ms: Math.round(performance.now() - startedAt),
    estimated_cost_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
  };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}
