import { SCORE_ALGORITHM_VERSION } from "@/modules/score/score.constant";
import type { ScoreEventRecord } from "@/modules/score/score.contract";
import { masteryBand, subjectScoreRule } from "@/modules/score/score.rule";

const ITERATIONS = Number(process.env.SCORE_BENCHMARK_ITERATIONS ?? 1000);

function event(index: number, mastery: number, level: ScoreEventRecord["topic_level"]): ScoreEventRecord {
  return {
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    evaluation_id: `10000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    feedback_session_id: `20000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    user_id: "benchmark-user",
    subject_slug: "benchmark-subject",
    topic_slug: `topic-${index}`,
    topic_level: level,
    mastery,
    mastery_band: masteryBand(mastery),
    factual_accuracy: Math.max(0, Math.min(4, Math.round(mastery / 25))),
    has_critical_misconception: mastery < 40,
    occurred_at: new Date(1_700_000_000_000 + index * 1000),
    algorithm_version: SCORE_ALGORITHM_VERSION,
    score_before: 0,
    score_after: 0,
    created_at: new Date(1_700_000_000_000 + index * 1000),
  };
}

function score(events: ScoreEventRecord[]): number {
  return subjectScoreRule.calculate("benchmark-user", "benchmark-subject", events).score;
}

function maximumJump(events: ScoreEventRecord[]): number {
  let previous = 0;
  let maximum = 0;

  for (let length = 1; length <= events.length; length += 1) {
    const current = score(events.slice(0, length));

    maximum = Math.max(maximum, Math.abs(current - previous));
    previous = current;
  }

  return maximum;
}

let randomState = 0x12345678;
function random(): number {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
}

function gaussian(): number {
  return Math.sqrt(-2 * Math.log(Math.max(random(), Number.EPSILON))) * Math.cos(2 * Math.PI * random());
}

const easyFarming = Array.from({ length: 100 }, (_, index) => event(index + 1, 100, "beginner"));
const specialist = Array.from({ length: 30 }, (_, index) => event(index + 1, 100, "specialist"));
const hardLow = [event(1, 20, "specialist")];
const weak = Array.from({ length: 30 }, (_, index) => event(index + 1, 20, "beginner"));
const recovered = [...weak, ...Array.from({ length: 30 }, (_, index) => event(index + 31, 100, "specialist"))];
const baselineAdvanced = Array.from({ length: 20 }, (_, index) => event(index + 1, 90, "advanced"));
const baselineScore = score(baselineAdvanced);
const noiseDrifts = new Array<number>(ITERATIONS);

for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
  const noisy = Array.from({ length: 20 }, (_, index) => {
    const mastery = Math.round(Math.max(0, Math.min(100, 90 + gaussian() * 10)));

    return event(index + 1, mastery, "advanced");
  });

  noiseDrifts[iteration] = Math.abs(score(noisy) - baselineScore);
}

noiseDrifts.sort((left, right) => left - right);
const p95NoiseDrift = noiseDrifts[Math.floor(noiseDrifts.length * 0.95)] ?? 0;
const chronological = score(specialist);
const reversedDelivery = score(specialist.toReversed());
const shiftedCalendar = score(
  specialist.map((item) => ({
    ...item,
    occurred_at: new Date(item.occurred_at.getTime() + 100 * 86_400_000),
  })),
);
const longHistory = Array.from({ length: 1000 }, (_, index) => event(index + 1, 80, "intermediate"));
const longHistoryStartedAt = performance.now();
const longHistoryScore = score(longHistory);
const longHistoryLatencyMs = Math.round((performance.now() - longHistoryStartedAt) * 100) / 100;

const results = {
  algorithm_version: SCORE_ALGORITHM_VERSION,
  iterations: ITERATIONS,
  easy_farming_score: score(easyFarming),
  specialist_progression: {
    after_1: score(specialist.slice(0, 1)),
    after_5: score(specialist.slice(0, 5)),
    after_10: score(specialist.slice(0, 10)),
    after_20: score(specialist.slice(0, 20)),
    after_30: chronological,
  },
  hard_low_mastery_score: score(hardLow),
  recovery_score_after_30: score(recovered),
  maximum_single_evaluation_jump: maximumJump(specialist),
  p95_noise_drift: p95NoiseDrift,
  delivery_order_difference: Math.abs(chronological - reversedDelivery),
  calendar_shift_difference: Math.abs(chronological - shiftedCalendar),
  long_history_1000: {
    score: longHistoryScore,
    calculation_latency_ms: longHistoryLatencyMs,
  },
};

console.log(JSON.stringify(results, null, 2));

const failedGates = [
  results.easy_farming_score <= 400 || "easy farming exceeded 400",
  results.hard_low_mastery_score === 0 || "low mastery on a hard topic increased score",
  results.recovery_score_after_30 > 600 || "sustained strong evidence did not recover",
  results.maximum_single_evaluation_jump <= 100 || "one evaluation moved score by more than 100",
  results.p95_noise_drift <= 75 || "P95 noise drift exceeded 75",
  results.delivery_order_difference === 0 || "delivery order changed the score",
  results.calendar_shift_difference === 0 || "civil calendar placement changed the score",
].filter((result): result is string => typeof result === "string");

if (failedGates.length > 0) throw new Error(`Score benchmark failed:\n- ${failedGates.join("\n- ")}`);
