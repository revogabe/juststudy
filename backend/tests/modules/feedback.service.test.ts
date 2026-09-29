import { describe, expect, it } from "bun:test";
import type { Transcript, Transcription } from "@/integrations/transcription";
import type {
  FeedbackRawEvaluation,
  FeedbackReview,
  FeedbackSessionCreate,
  FeedbackSessionRecord,
  FeedbackShadowReviewer,
  FeedbackShadowReviewWrite,
} from "@/modules/feedback/feedback.contract";
import { createFeedbackService } from "@/modules/feedback/feedback.service";
import type { FeedbackStore } from "@/modules/feedback/feedback.store";
import type { KnowledgeAssessmentContext } from "@/modules/knowledge";

const USER_ID = "user-1";
const FOCUS_ID = "00000000-0000-4000-8000-000000000001";
const RANDOMIZATION_ID = "00000000-0000-4000-8000-000000000002";
const STARTED_AT = new Date("2026-09-07T12:00:00.000Z");

const context: KnowledgeAssessmentContext = {
  subject: { slug: "biology", name: "Biology" },
  topic: { slug: "photosynthesis", name: "Photosynthesis", level: "intermediate" },
  assessment: {
    reference_summary: "Photosynthesis converts light energy into chemical energy.",
    key_concepts: ["Light reactions", "Calvin cycle", "Water and carbon dioxide"],
    common_misconceptions: ["Oxygen comes directly from carbon dioxide"],
    version: "test-v1",
  },
};

const transcript: Transcript = {
  text: "Light is used by the plant to produce chemical energy.",
  language: "en",
  language_probability: 0.99,
  duration_seconds: 12,
  model: "turbo",
  segments: [
    {
      id: "seg_1",
      start_ms: 0,
      end_ms: 12_000,
      text: "Light is used by the plant to produce chemical energy.",
    },
  ],
};

function criterion(score: number) {
  return {
    score,
    feedback: "Feedback",
    evidence: [{ segment_id: "seg_1", quote: "Light is used" }],
  };
}

const rawEvaluation: FeedbackRawEvaluation = {
  language: "en",
  scorable: true,
  insufficient_reason: null,
  headline: "Mostly correct",
  summary: "The explanation has a sound foundation.",
  rubric: {
    factual_accuracy: criterion(3),
    coverage: criterion(3),
    conceptual_reasoning: criterion(3),
    clarity: criterion(4),
  },
  understanding_map: [],
  reasoning_analysis: {
    observed_approach: "Cause to effect",
    what_worked: ["Connected light to chemical energy"],
    where_it_broke: [],
  },
  corrections: [],
  strengths: [],
  improvement_plan: [],
  recommended_outline: [],
  follow_up_questions: [],
  uncertainties: [],
};

function createFixture(shadow: FeedbackShadowReviewer | null = null) {
  let currentTime = STARTED_AT;
  let activeStudent = true;
  let usageEvents = 0;
  const sessions: FeedbackSessionRecord[] = [];
  const shadowReviews: FeedbackShadowReviewWrite[] = [];

  const store: FeedbackStore = {
    session: {
      async create(input: FeedbackSessionCreate) {
        const existing = sessions.find((session) => session.focus_session_id === input.focus_session_id && session.status !== "expired");

        if (existing) return { result: "existing", session: existing } as const;

        const session: FeedbackSessionRecord = {
          id: "00000000-0000-4000-8000-000000000010",
          focus_session_id: input.focus_session_id,
          randomization_id: input.randomization_id,
          user_id: input.user_id,
          subject_slug: input.context.subject.slug,
          subject_name: input.context.subject.name,
          topic_slug: input.context.topic.slug,
          topic_name: input.context.topic.name,
          topic_level: input.context.topic.level,
          assessment_context: input.context,
          status: "active",
          started_at: input.started_at,
          recording_ends_at: input.recording_ends_at,
          upload_ends_at: input.upload_ends_at,
          last_seen_at: input.started_at,
          submitted_at: null,
          completed_at: null,
          transcript: null,
          evaluation_id: null,
          evaluation: null,
          evaluation_provider: null,
          evaluation_model: null,
          prompt_version: null,
          schema_version: null,
          input_tokens: null,
          output_tokens: null,
          total_tokens: null,
          estimated_cost_usd: null,
          evaluation_latency_ms: null,
          score_before: null,
          score_after: null,
          score_algorithm_version: null,
          process_attempts: 0,
          next_attempt_at: null,
          lease_until: null,
          error_code: null,
          usage_synced_at: null,
          updated_at: input.started_at,
        };

        sessions.push(session);
        return { result: "created", session } as const;
      },
      async get(userId, sessionId) {
        return sessions.find((session) => session.user_id === userId && session.id === sessionId) ?? null;
      },
      async heartbeat(userId, sessionId, seenAt) {
        const session = sessions.find((item) => item.user_id === userId && item.id === sessionId);
        if (!session) return null;
        session.last_seen_at = seenAt;
        session.updated_at = seenAt;
        return session;
      },
      async expire(userId, sessionId, expiredAt) {
        const session = sessions.find((item) => item.user_id === userId && item.id === sessionId);
        if (!session) return null;
        session.status = "expired";
        session.updated_at = expiredAt;
        return session;
      },
      async submit(userId, sessionId, submittedTranscript, submittedAt) {
        const session = sessions.find((item) => item.user_id === userId && item.id === sessionId);
        if (!session) return null;
        session.status = "pending";
        session.transcript = submittedTranscript;
        session.submitted_at = submittedAt;
        session.next_attempt_at = submittedAt;
        return session;
      },
    },
    expiration: {
      async update() {
        return 0;
      },
    },
    history: {
      async search() {
        return { feedback: sessions.filter((session) => session.submitted_at), next_cursor: null };
      },
    },
    job: {
      async claim() {
        return sessions.filter((session) => session.status === "pending");
      },
      async saveEvaluation(input) {
        const session = sessions.find((item) => item.id === input.session_id);
        if (!session) return null;
        session.evaluation_id = input.result.evaluation_id;
        session.evaluation = input.evaluation;
        session.evaluation_provider = input.result.provider;
        session.evaluation_model = input.result.model;
        session.prompt_version = input.result.prompt_version;
        session.schema_version = input.result.schema_version;
        session.input_tokens = input.result.input_tokens;
        session.output_tokens = input.result.output_tokens;
        session.total_tokens = input.result.total_tokens;
        session.estimated_cost_usd = input.result.estimated_cost_usd;
        session.evaluation_latency_ms = input.result.latency_ms;
        return session;
      },
      async complete(input) {
        const session = sessions.find((item) => item.id === input.session_id);
        if (!session) return null;
        session.status = "completed";
        session.completed_at = input.completed_at;
        session.score_before = input.score_before;
        session.score_after = input.score_after;
        session.score_algorithm_version = input.score_algorithm_version;
        return session;
      },
      async fail() {},
    },
    usage: {
      async search() {
        return sessions.filter((session) => session.status === "completed" && !session.usage_synced_at);
      },
      async markSynced(sessionId, syncedAt) {
        const session = sessions.find((item) => item.id === sessionId);
        if (session) session.usage_synced_at = syncedAt;
      },
    },
    shadow: {
      async search(input) {
        return sessions.filter(
          (session) =>
            session.status === "completed" &&
            !shadowReviews.some((review) => review.feedback_session_id === session.id && review.mode === input.mode),
        );
      },
      async create(input) {
        shadowReviews.push(input);
      },
    },
  };

  const transcription: Transcription = {
    transcript: {
      async create() {
        return transcript;
      },
    },
  };
  const review: FeedbackReview = {
    explanation: {
      async create() {
        return {
          evaluation_id: "00000000-0000-4000-8000-000000000020",
          evaluation: rawEvaluation,
          provider: "ollama",
          model: "qwen3.5:9b",
          prompt_version: "local-v1",
          schema_version: "explanation-evaluation-v1",
          input_tokens: 500,
          output_tokens: 250,
          total_tokens: 750,
          estimated_cost_usd: 0,
          latency_ms: 100,
        };
      },
    },
  };
  const service = createFeedbackService({
    store,
    transcription,
    review,
    billing: {
      entitlement: {
        async get() {
          return { active_student: activeStudent };
        },
      },
      usage: {
        async create() {
          usageEvents += 1;
        },
      },
    },
    focus: {
      session: {
        async get() {
          return {
            id: FOCUS_ID,
            randomization_id: RANDOMIZATION_ID,
            duration_seconds: 3600,
            status: "completed" as const,
            started_at: new Date("2026-09-07T11:00:00.000Z"),
            ends_at: STARTED_AT,
            last_seen_at: STARTED_AT,
            finished_at: STARTED_AT,
            updated_at: STARTED_AT,
          };
        },
        create: async () => {
          throw new Error("Not used");
        },
        getActive: async () => null,
        heartbeat: async () => {
          throw new Error("Not used");
        },
        complete: async () => {
          throw new Error("Not used");
        },
        abandon: async () => {
          throw new Error("Not used");
        },
        expire: async () => 0,
      },
    },
    randomize: {
      attempt: {
        async get() {
          return null;
        },
        async update() {
          return null;
        },
        async search() {
          return [
            {
              id: RANDOMIZATION_ID,
              subject: context.subject,
              topic: context.topic,
              status: "completed" as const,
              created_at: STARTED_AT,
              updated_at: STARTED_AT,
            },
          ];
        },
      },
    },
    knowledge: {
      assessment: {
        async get() {
          return context;
        },
      },
    },
    score: {
      evaluation: {
        async create(input) {
          return {
            before: 100,
            after: 132,
            delta: 32,
            algorithm_version: "ordinal_bayes_v1",
            snapshot: {
              user_id: input.user_id,
              subject_slug: input.subject_slug,
              score: 132,
              certified_level: null,
              evaluations_count: 1,
              distinct_topics_count: 1,
              provisional: true,
              algorithm_version: "ordinal_bayes_v1",
              updated_at: currentTime,
            },
          };
        },
      },
    },
    shadow,
    now: () => currentTime,
  });

  return {
    service,
    sessions,
    shadowReviews,
    get usageEvents() {
      return usageEvents;
    },
    setActiveStudent(value: boolean) {
      activeStudent = value;
    },
    setNow(value: string) {
      currentTime = new Date(value);
    },
  };
}

describe("feedback service", () => {
  it("requires an active student subscription", async () => {
    const fixture = createFixture();
    fixture.setActiveStudent(false);

    await expect(fixture.service.session.create({ focus_session_id: FOCUS_ID, user_id: USER_ID })).rejects.toMatchObject({
      code: "FEEDBACK_SUBSCRIPTION_REQUIRED",
      status: 403,
    });
  });

  it("starts, transcribes, evaluates, scores, and meters one feedback", async () => {
    const fixture = createFixture();
    const started = await fixture.service.session.create({ focus_session_id: FOCUS_ID, user_id: USER_ID });

    expect(started.recording_ends_at).toEqual(new Date("2026-09-07T12:15:00.000Z"));
    expect(started.upload_ends_at).toEqual(new Date("2026-09-07T12:17:00.000Z"));

    const submitted = await fixture.service.session.submit({
      session_id: started.id,
      user_id: USER_ID,
      bytes: Uint8Array.from([1, 2, 3]),
      filename: "answer.webm",
      media_type: "audio/webm",
    });

    expect(submitted.status).toBe("pending");
    expect(submitted.transcript?.segments[0]?.id).toBe("seg_1");

    await fixture.service.job.process();
    const completed = await fixture.service.session.get({ session_id: started.id, user_id: USER_ID });

    expect(completed.status).toBe("completed");
    expect(completed.evaluation).toMatchObject({ mastery: 75, verdict: "mostly_correct" });
    expect(completed.score_before).toBe(100);
    expect(completed.score_after).toBe(132);
    expect(fixture.usageEvents).toBe(1);
  });

  it("records a decision shadow review after completion without changing the student result", async () => {
    const fixture = createFixture({
      mode: "decision",
      review: {
        explanation: {
          async create() {
            return {
              decision: {
                scorable: true,
                scorable_probability: 0.97,
                rubric: {
                  factual_accuracy: { score: 3.8, confidence: 0.9 },
                  coverage: { score: 3.1, confidence: 0.8 },
                  conceptual_reasoning: { score: 3.4, confidence: 0.8 },
                  clarity: { score: 3.9, confidence: 0.9 },
                },
                segments: [{ segment_id: "seg_1", contradiction_probability: 0.02, severity: "minor", severity_confidence: 0.7 }],
                correction_segment_ids: [],
                mastery: 88,
                verdict: "correct",
                depth: "concise",
                confidence: 0.8,
              },
              provider: "openrouter",
              model: "typesafe/jev-1.13",
              question_version: "explanation-decision-v1",
              input_tokens: 900,
              output_tokens: 80,
              estimated_cost_usd: 0.00004,
              latency_ms: 300,
            };
          },
        },
      },
    });
    const started = await fixture.service.session.create({ focus_session_id: FOCUS_ID, user_id: USER_ID });
    await fixture.service.session.submit({
      session_id: started.id,
      user_id: USER_ID,
      bytes: Uint8Array.from([1, 2, 3]),
      filename: "answer.webm",
      media_type: "audio/webm",
    });

    await fixture.service.job.process();
    const completed = await fixture.service.session.get({ session_id: started.id, user_id: USER_ID });

    expect(completed.evaluation).toMatchObject({ mastery: 75, verdict: "mostly_correct" });
    expect(fixture.shadowReviews).toHaveLength(1);
    expect(fixture.shadowReviews[0]).toMatchObject({
      mode: "decision",
      status: "completed",
      mastery: 88,
      verdict: "correct",
      primary_mastery: 75,
      primary_verdict: "mostly_correct",
      model: "typesafe/jev-1.13",
    });

    await fixture.service.job.process();

    expect(fixture.shadowReviews).toHaveLength(1);
  });

  it("records a failed shadow review and keeps the primary evaluation", async () => {
    const fixture = createFixture({
      mode: "llm",
      review: {
        explanation: {
          async create() {
            throw new Error("shadow provider unavailable");
          },
        },
      },
    });
    const started = await fixture.service.session.create({ focus_session_id: FOCUS_ID, user_id: USER_ID });
    await fixture.service.session.submit({
      session_id: started.id,
      user_id: USER_ID,
      bytes: Uint8Array.from([1, 2, 3]),
      filename: "answer.webm",
      media_type: "audio/webm",
    });

    await fixture.service.job.process();

    expect(fixture.sessions[0]?.status).toBe("completed");
    expect(fixture.shadowReviews[0]).toMatchObject({ mode: "llm", status: "failed", error_code: "FEEDBACK_SHADOW_REVIEW_FAILED" });
  });
});
