import { t } from "elysia";
import { FEEDBACK_HISTORY_MAX_LIMIT, FEEDBACK_MAX_AUDIO_BYTES } from "./feedback.constant";

const feedbackStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("pending"),
  t.Literal("completed"),
  t.Literal("failed"),
  t.Literal("expired"),
]);

const topicLevelSchema = t.Union([t.Literal("beginner"), t.Literal("intermediate"), t.Literal("advanced"), t.Literal("specialist")]);

const evidenceSchema = t.Object({ segment_id: t.String(), quote: t.String() }, { additionalProperties: false });

const criterionSchema = t.Object(
  {
    score: t.Integer({ minimum: 0, maximum: 4 }),
    feedback: t.String(),
    evidence: t.Array(evidenceSchema),
  },
  { additionalProperties: false },
);

const evaluationSchema = t.Object(
  {
    language: t.String(),
    scorable: t.Boolean(),
    insufficient_reason: t.Union([t.String(), t.Null()]),
    mastery: t.Union([t.Integer({ minimum: 0, maximum: 100 }), t.Null()]),
    verdict: t.Union([
      t.Literal("correct"),
      t.Literal("mostly_correct"),
      t.Literal("partial"),
      t.Literal("incorrect"),
      t.Literal("insufficient"),
    ]),
    depth: t.Union([t.Literal("concise"), t.Literal("standard"), t.Literal("deep")]),
    headline: t.String(),
    summary: t.String(),
    rubric: t.Object(
      {
        factual_accuracy: criterionSchema,
        coverage: criterionSchema,
        conceptual_reasoning: criterionSchema,
        clarity: criterionSchema,
      },
      { additionalProperties: false },
    ),
    understanding_map: t.Array(
      t.Object(
        {
          concept: t.String(),
          status: t.Union([t.Literal("correct"), t.Literal("partial"), t.Literal("incorrect"), t.Literal("missing")]),
          feedback: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
    reasoning_analysis: t.Object(
      {
        observed_approach: t.String(),
        what_worked: t.Array(t.String()),
        where_it_broke: t.Array(
          t.Object(
            {
              step: t.String(),
              problem: t.String(),
              consequence: t.String(),
              better_connection: t.String(),
            },
            { additionalProperties: false },
          ),
        ),
      },
      { additionalProperties: false },
    ),
    corrections: t.Array(
      t.Object(
        {
          priority: t.Integer({ minimum: 1 }),
          severity: t.Union([t.Literal("minor"), t.Literal("important"), t.Literal("critical")]),
          student_claim: t.String(),
          segment_id: t.String(),
          why_it_is_incorrect: t.String(),
          correct_explanation: t.String(),
          memory_hook: t.Union([t.String(), t.Null()]),
        },
        { additionalProperties: false },
      ),
    ),
    strengths: t.Array(
      t.Object(
        {
          title: t.String(),
          detail: t.String(),
          evidence_segment_ids: t.Array(t.String()),
        },
        { additionalProperties: false },
      ),
    ),
    improvement_plan: t.Array(
      t.Object(
        {
          step: t.Integer({ minimum: 1 }),
          action: t.String(),
          success_criterion: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
    recommended_outline: t.Array(t.String()),
    follow_up_questions: t.Array(t.Object({ question: t.String(), purpose: t.String() }, { additionalProperties: false })),
    uncertainties: t.Array(t.String()),
  },
  { additionalProperties: false },
);

const transcriptSchema = t.Object(
  {
    text: t.String(),
    language: t.String(),
    language_probability: t.Number({ minimum: 0, maximum: 1 }),
    duration_seconds: t.Number({ minimum: 0 }),
    model: t.String(),
    segments: t.Array(
      t.Object(
        {
          id: t.String(),
          start_ms: t.Integer({ minimum: 0 }),
          end_ms: t.Integer({ minimum: 0 }),
          text: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const feedbackSessionSchema = t.Object(
  {
    id: t.String({ format: "uuid" }),
    focus_session_id: t.String({ format: "uuid" }),
    randomization_id: t.String({ format: "uuid" }),
    status: feedbackStatusSchema,
    subject: t.Object({ slug: t.String(), name: t.String() }, { additionalProperties: false }),
    topic: t.Object({ slug: t.String(), name: t.String(), level: topicLevelSchema }, { additionalProperties: false }),
    started_at: t.String({ format: "date-time" }),
    recording_ends_at: t.String({ format: "date-time" }),
    upload_ends_at: t.String({ format: "date-time" }),
    last_seen_at: t.String({ format: "date-time" }),
    submitted_at: t.Union([t.String({ format: "date-time" }), t.Null()]),
    completed_at: t.Union([t.String({ format: "date-time" }), t.Null()]),
    transcript: t.Union([transcriptSchema, t.Null()]),
    evaluation: t.Union([evaluationSchema, t.Null()]),
    score_change: t.Union([
      t.Object(
        {
          subject_slug: t.String(),
          before: t.Integer({ minimum: 0, maximum: 1000 }),
          after: t.Integer({ minimum: 0, maximum: 1000 }),
          delta: t.Integer({ minimum: -100, maximum: 100 }),
          algorithm_version: t.String(),
        },
        { additionalProperties: false },
      ),
      t.Null(),
    ]),
    error_code: t.Union([t.String(), t.Null()]),
    updated_at: t.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const feedbackSessionStartSchema = t.Object({ focus_session_id: t.String({ format: "uuid" }) }, { additionalProperties: false });

export const feedbackSessionParamsSchema = t.Object({ session_id: t.String({ format: "uuid" }) }, { additionalProperties: false });

export const feedbackSubmitSchema = t.Object(
  {
    audio: t.File({
      maxSize: FEEDBACK_MAX_AUDIO_BYTES,
    }),
  },
  { additionalProperties: false },
);

export const feedbackHistoryQuerySchema = t.Object(
  {
    limit: t.Optional(t.Integer({ minimum: 1, maximum: FEEDBACK_HISTORY_MAX_LIMIT })),
    cursor: t.Optional(t.String({ format: "uuid" })),
  },
  { additionalProperties: false },
);

export const feedbackHistorySchema = t.Object(
  {
    feedback: t.Array(feedbackSessionSchema),
    next_cursor: t.Union([t.String({ format: "uuid" }), t.Null()]),
  },
  { additionalProperties: false },
);
