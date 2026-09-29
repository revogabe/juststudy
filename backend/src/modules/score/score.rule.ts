import type { KnowledgeLevel } from "@/modules/knowledge/knowledge.contract";
import {
  SCORE_ALGORITHM_VERSION,
  SCORE_LEVEL_CEILINGS,
  SCORE_LEVEL_DIFFICULTIES,
  SCORE_LEVEL_ORDER,
  SCORE_MAX_CHANGE,
  SCORE_PROVISIONAL_TOPIC_COUNT,
} from "./score.constant";
import type { ScoreEventRecord, SubjectScoreRecord } from "./score.contract";

const ABILITY_MAX = 1000;
const EVIDENCE_HALF_LIFE = 10;
const EVIDENCE_STRENGTH = 0.4;
const LOGISTIC_SCALE = 125;
const PRIOR_STANDARD_DEVIATION = 250;
const RECENCY_MULTIPLIER = 2 ** (-1 / EVIDENCE_HALF_LIFE);
const THRESHOLDS = [-150, -50, 50, 150] as const;
const NOVELTY_REDUCTIONS = [0.5, 0.25, 0.25] as const;
const MASTERY_BAND_CENTERS = [20, 47.5, 62.5, 77.5, 92.5] as const;

export function masteryBand(mastery: number): number {
  if (mastery < 40) return 0;
  if (mastery < 55) return 1;
  if (mastery < 70) return 2;
  if (mastery < 85) return 3;

  return 4;
}

export function calculateSubjectScore(userId: string, subjectSlug: string, events: ScoreEventRecord[]): SubjectScoreRecord {
  const ordered = events.toSorted(compareEvents);
  const evidenceLogs = new Array<number>(ABILITY_MAX + 1).fill(0);
  const attemptsByTopic = new Map<string, Array<{ event: ScoreEventRecord; index: number }>>();
  const qualifyingTopics = new Map(SCORE_LEVEL_ORDER.map((level) => [level, new Set<string>()] as const));
  let score = 0;
  let certifiedLevel: KnowledgeLevel | null = null;
  let hasPositiveBand = false;

  for (const [index, event] of ordered.entries()) {
    const previousAttempts = attemptsByTopic.get(event.topic_slug) ?? [];

    for (let ability = 0; ability <= ABILITY_MAX; ability += 1) {
      const evidence = (evidenceLogs[ability] ?? 0) * RECENCY_MULTIPLIER;
      let likelihood = masteryLogLikelihood(ability, event.topic_level, event.mastery);

      for (const [attemptIndex, previous] of previousAttempts.entries()) {
        const reduction = NOVELTY_REDUCTIONS[attemptIndex];

        if (reduction === undefined) break;

        const age = index - previous.index;
        likelihood -=
          reduction * RECENCY_MULTIPLIER ** age * masteryLogLikelihood(ability, previous.event.topic_level, previous.event.mastery);
      }

      evidenceLogs[ability] = evidence + EVIDENCE_STRENGTH * likelihood;
    }

    attemptsByTopic.set(event.topic_slug, [{ event, index }, ...previousAttempts.slice(0, NOVELTY_REDUCTIONS.length - 1)]);
    hasPositiveBand ||= event.mastery_band > 0;
    updateQualifications(qualifyingTopics, event);
    certifiedLevel = highestCertifiedLevel(qualifyingTopics);

    const target = hasPositiveBand ? targetFromEvidence(evidenceLogs, certifiedLevel) : 0;

    score = Math.round(Math.max(score - SCORE_MAX_CHANGE, Math.min(score + SCORE_MAX_CHANGE, target)));
  }

  const distinctTopics = new Set(ordered.map((event) => event.topic_slug)).size;

  return {
    user_id: userId,
    subject_slug: subjectSlug,
    score,
    certified_level: certifiedLevel,
    evaluations_count: ordered.length,
    distinct_topics_count: distinctTopics,
    provisional: distinctTopics < SCORE_PROVISIONAL_TOPIC_COUNT,
    algorithm_version: SCORE_ALGORITHM_VERSION,
    updated_at: ordered.at(-1)?.occurred_at ?? new Date(0),
  };
}

function targetFromEvidence(evidenceLogs: number[], certifiedLevel: KnowledgeLevel | null): number {
  const logs = evidenceLogs.map((evidence, ability) => -(ability ** 2) / (2 * PRIOR_STANDARD_DEVIATION ** 2) + evidence);
  const percentile = posteriorPercentile(logs, 0.05);
  const ceiling = certifiedLevel ? SCORE_LEVEL_CEILINGS[certifiedLevel] : 400;

  return Math.min(percentile, ceiling);
}

function masteryLogLikelihood(ability: number, level: KnowledgeLevel, mastery: number): number {
  if (mastery <= (MASTERY_BAND_CENTERS[0] ?? 0)) return Math.log(Math.max(categoryProbability(ability, level, 0), Number.EPSILON));
  if (mastery >= (MASTERY_BAND_CENTERS[4] ?? 100)) return Math.log(Math.max(categoryProbability(ability, level, 4), Number.EPSILON));

  for (let upper = 1; upper < MASTERY_BAND_CENTERS.length; upper += 1) {
    const lowerCenter = MASTERY_BAND_CENTERS[upper - 1] as number;
    const upperCenter = MASTERY_BAND_CENTERS[upper] as number;

    if (mastery > upperCenter) continue;

    const blend = (mastery - lowerCenter) / (upperCenter - lowerCenter);
    const lowerProbability = Math.max(categoryProbability(ability, level, upper - 1), Number.EPSILON);
    const upperProbability = Math.max(categoryProbability(ability, level, upper), Number.EPSILON);

    return (1 - blend) * Math.log(lowerProbability) + blend * Math.log(upperProbability);
  }

  return Math.log(Number.EPSILON);
}

function categoryProbability(ability: number, level: KnowledgeLevel, category: number): number {
  const cumulative = THRESHOLDS.map((threshold) => sigmoid((ability - (SCORE_LEVEL_DIFFICULTIES[level] + threshold)) / LOGISTIC_SCALE));

  if (category === 0) return 1 - (cumulative[0] ?? 0);
  if (category === 4) return cumulative[3] ?? 0;

  return (cumulative[category - 1] ?? 0) - (cumulative[category] ?? 0);
}

function posteriorPercentile(logs: number[], percentile: number): number {
  const maximum = Math.max(...logs);
  const weights = logs.map((value) => Math.exp(value - maximum));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cumulative = 0;

  for (const [ability, weight] of weights.entries()) {
    cumulative += weight;

    if (cumulative / total >= percentile) return ability;
  }

  return ABILITY_MAX;
}

function updateQualifications(qualifyingTopics: Map<KnowledgeLevel, Set<string>>, event: ScoreEventRecord): void {
  if (event.mastery < 75 || event.factual_accuracy < 3 || event.has_critical_misconception) return;

  const eventLevelRank = SCORE_LEVEL_ORDER.indexOf(event.topic_level);

  for (const [rank, level] of SCORE_LEVEL_ORDER.entries()) {
    if (rank > eventLevelRank) break;

    qualifyingTopics.get(level)?.add(event.topic_slug);
  }
}

function highestCertifiedLevel(qualifyingTopics: Map<KnowledgeLevel, Set<string>>): KnowledgeLevel | null {
  let certified: KnowledgeLevel | null = null;

  for (const level of SCORE_LEVEL_ORDER) {
    if ((qualifyingTopics.get(level)?.size ?? 0) >= 2) certified = level;
  }

  return certified;
}

function compareEvents(left: ScoreEventRecord, right: ScoreEventRecord): number {
  return left.occurred_at.getTime() - right.occurred_at.getTime() || left.id.localeCompare(right.id);
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export const subjectScoreRule = {
  calculate: calculateSubjectScore,
};
