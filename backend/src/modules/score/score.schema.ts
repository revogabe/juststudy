import { t } from "elysia";

const scoreLevelSchema = t.Union([t.Literal("beginner"), t.Literal("intermediate"), t.Literal("advanced"), t.Literal("specialist")]);

export const scoresSchema = t.Object(
  {
    subjects: t.Array(
      t.Object(
        {
          subject_slug: t.String(),
          subject_name: t.String(),
          score: t.Integer({ minimum: 0, maximum: 1000 }),
          certified_level: t.Union([scoreLevelSchema, t.Null()]),
          evaluations_count: t.Integer({ minimum: 0 }),
          distinct_topics_count: t.Integer({ minimum: 0 }),
          provisional: t.Boolean(),
          algorithm_version: t.String(),
          updated_at: t.Union([t.String({ format: "date-time" }), t.Null()]),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
