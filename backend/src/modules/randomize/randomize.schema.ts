import { t } from "elysia";

const HISTORY_MAX_LIMIT = 100;

const slugSchema = t.String({
  minLength: 1,
  maxLength: 120,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});

const randomizationProperties = {
  id: t.String({ format: "uuid" }),
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
  created_at: t.String({ format: "date-time" }),
  updated_at: t.String({ format: "date-time" }),
};

export const randomizeTopicInputSchema = t.Object(
  {
    subject_slug: t.Optional(slugSchema),
  },
  { additionalProperties: false },
);

export const randomizeTopicSchema = t.Object(
  {
    ...randomizationProperties,
    status: t.Literal("pending"),
  },
  { additionalProperties: false },
);

export const randomizeHistoryQuerySchema = t.Object(
  {
    limit: t.Optional(t.Integer({ minimum: 1, maximum: HISTORY_MAX_LIMIT })),
    cursor: t.Optional(t.String({ format: "uuid" })),
  },
  { additionalProperties: false },
);

export const randomizeHistorySchema = t.Object(
  {
    randomizations: t.Array(
      t.Object(
        {
          ...randomizationProperties,
          status: t.Union([t.Literal("pending"), t.Literal("abandoned"), t.Literal("completed")]),
        },
        { additionalProperties: false },
      ),
    ),
    next_cursor: t.Union([t.String({ format: "uuid" }), t.Null()]),
  },
  { additionalProperties: false },
);
