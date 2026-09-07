import { t } from "elysia";

const slugSchema = t.String({
  minLength: 1,
  maxLength: 120,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});

const nameSchema = t.String({ minLength: 1, maxLength: 160 });

const knowledgeLevelSchema = t.Union([
  t.Literal("beginner"),
  t.Literal("intermediate"),
  t.Literal("advanced"),
  t.Literal("specialist"),
]);

const knowledgeTopicInputSchema = t.Object(
  {
    slug: slugSchema,
    name: nameSchema,
    level: knowledgeLevelSchema,
  },
  { additionalProperties: false },
);

export const knowledgeCatalogInputSchema = t.Object(
  {
    subjects: t.Optional(
      t.Array(
        t.Object(
          {
            slug: slugSchema,
            name: nameSchema,
            topics: t.Array(knowledgeTopicInputSchema),
          },
          { additionalProperties: false },
        ),
      ),
    ),
    topic_batches: t.Optional(
      t.Array(
        t.Object(
          {
            subject_slug: slugSchema,
            topics: t.Array(knowledgeTopicInputSchema),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

const levelCountsSchema = t.Object({
  beginner: t.Integer({ minimum: 0 }),
  intermediate: t.Integer({ minimum: 0 }),
  advanced: t.Integer({ minimum: 0 }),
  specialist: t.Integer({ minimum: 0 }),
});

export const knowledgeSubjectsSchema = t.Object({
  subjects: t.Array(
    t.Object({
      slug: t.String(),
      name: t.String(),
      topic_count: t.Integer({ minimum: 0 }),
      level_counts: levelCountsSchema,
    }),
  ),
});

export const knowledgeCatalogResultSchema = t.Object({
  subjects_created: t.Integer({ minimum: 0 }),
  subjects_skipped: t.Integer({ minimum: 0 }),
  topics_created: t.Integer({ minimum: 0 }),
  topics_skipped: t.Integer({ minimum: 0 }),
});
