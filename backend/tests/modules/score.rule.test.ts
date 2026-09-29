import { describe, expect, it } from "bun:test";
import { SCORE_ALGORITHM_VERSION } from "@/modules/score/score.constant";
import type { ScoreEventRecord } from "@/modules/score/score.contract";
import { masteryBand, subjectScoreRule } from "@/modules/score/score.rule";

function event(index: number, input: Partial<ScoreEventRecord> = {}): ScoreEventRecord {
  const mastery = input.mastery ?? 100;

  return {
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    evaluation_id: `10000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    feedback_session_id: `20000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    user_id: "user-1",
    subject_slug: "biology",
    topic_slug: input.topic_slug ?? `topic-${index}`,
    topic_level: input.topic_level ?? "specialist",
    mastery,
    mastery_band: input.mastery_band ?? masteryBand(mastery),
    factual_accuracy: input.factual_accuracy ?? 4,
    has_critical_misconception: input.has_critical_misconception ?? false,
    occurred_at: input.occurred_at ?? new Date(1_700_000_000_000 + index * 1000),
    algorithm_version: SCORE_ALGORITHM_VERSION,
    score_before: input.score_before ?? 0,
    score_after: input.score_after ?? 0,
    created_at: input.created_at ?? new Date(1_700_000_000_000 + index * 1000),
  };
}

describe("subject score rule", () => {
  it("starts at zero and gives no progress for low mastery on a hard topic", () => {
    expect(subjectScoreRule.calculate("user-1", "biology", []).score).toBe(0);
    expect(subjectScoreRule.calculate("user-1", "biology", [event(1, { mastery: 20, mastery_band: 0 })]).score).toBe(0);
  });

  it("caps easy-topic farming and every individual change", () => {
    const events = Array.from({ length: 100 }, (_, index) => event(index + 1, { topic_level: "beginner" }));
    const score = subjectScoreRule.calculate("user-1", "biology", events).score;

    expect(score).toBeLessThanOrEqual(400);
  });

  it("requires two distinct strong topics to certify higher ceilings", () => {
    const first = subjectScoreRule.calculate("user-1", "biology", [event(1)]);
    const second = subjectScoreRule.calculate("user-1", "biology", [event(1), event(2)]);

    expect(first.certified_level).toBeNull();
    expect(second.certified_level).toBe("specialist");
    expect(second.provisional).toBe(true);
  });

  it("is independent from delivery order and civil calendar dates", () => {
    const events = Array.from({ length: 12 }, (_, index) =>
      event(index + 1, {
        mastery: 70 + index,
        mastery_band: masteryBand(70 + index),
      }),
    );
    const ordered = subjectScoreRule.calculate("user-1", "biology", events);
    const reversed = subjectScoreRule.calculate("user-1", "biology", events.toReversed());
    const shifted = subjectScoreRule.calculate(
      "user-1",
      "biology",
      events.map((item) => ({
        ...item,
        occurred_at: new Date(item.occurred_at.getTime() + 90 * 86_400_000),
      })),
    );

    expect(reversed.score).toBe(ordered.score);
    expect(shifted.score).toBe(ordered.score);
  });

  it("lets sustained newer evidence recover from an older weak period", () => {
    const weak = Array.from({ length: 30 }, (_, index) =>
      event(index + 1, {
        topic_level: "beginner",
        mastery: 20,
        mastery_band: 0,
      }),
    );
    const improving = Array.from({ length: 30 }, (_, index) => event(index + 31));
    const before = subjectScoreRule.calculate("user-1", "biology", weak);
    const after = subjectScoreRule.calculate("user-1", "biology", [...weak, ...improving]);

    expect(before.score).toBe(0);
    expect(after.score).toBeGreaterThan(600);
  });
});
