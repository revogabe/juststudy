import { t } from "elysia";
import { FOCUS_MAX_DURATION_SECONDS, FOCUS_MIN_DURATION_SECONDS } from "./focus.constant";

const focusStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("completed"),
  t.Literal("abandoned"),
]);
const HISTORY_MAX_LIMIT = 100;

const focusSessionProperties = {
  id: t.String({ format: "uuid" }),
  randomization_id: t.String({ format: "uuid" }),
  duration_seconds: t.Integer({
    minimum: FOCUS_MIN_DURATION_SECONDS,
    maximum: FOCUS_MAX_DURATION_SECONDS,
  }),
  status: focusStatusSchema,
  started_at: t.String({ format: "date-time" }),
  ends_at: t.String({ format: "date-time" }),
  last_seen_at: t.String({ format: "date-time" }),
  finished_at: t.Union([t.String({ format: "date-time" }), t.Null()]),
  updated_at: t.String({ format: "date-time" }),
};

export const focusSessionSchema = t.Object(focusSessionProperties, { additionalProperties: false });

export const focusSessionCreateSchema = t.Object(
  {
    randomization_id: t.String({ format: "uuid" }),
    duration_seconds: t.Integer({
      minimum: FOCUS_MIN_DURATION_SECONDS,
      maximum: FOCUS_MAX_DURATION_SECONDS,
    }),
  },
  { additionalProperties: false },
);

export const focusSessionParamsSchema = t.Object(
  {
    session_id: t.String({ format: "uuid" }),
  },
  { additionalProperties: false },
);

export const activeFocusSessionSchema = t.Object(
  {
    session: t.Union([focusSessionSchema, t.Null()]),
  },
  { additionalProperties: false },
);

export const focusHistoryQuerySchema = t.Object(
  {
    limit: t.Optional(t.Integer({ minimum: 1, maximum: HISTORY_MAX_LIMIT })),
    cursor: t.Optional(t.String({ format: "uuid" })),
  },
  { additionalProperties: false },
);

export const focusHistorySchema = t.Object(
  {
    sessions: t.Array(
      t.Object(
        {
          ...focusSessionProperties,
          subject: t.Object(
            {
              slug: t.String(),
              name: t.String(),
            },
            { additionalProperties: false },
          ),
          topic: t.Object(
            {
              slug: t.String(),
              name: t.String(),
              level: t.Union([
                t.Literal("beginner"),
                t.Literal("intermediate"),
                t.Literal("advanced"),
                t.Literal("specialist"),
              ]),
            },
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
    next_cursor: t.Union([t.String({ format: "uuid" }), t.Null()]),
  },
  { additionalProperties: false },
);
