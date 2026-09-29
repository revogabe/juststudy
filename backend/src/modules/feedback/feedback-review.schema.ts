import { z } from "zod";
import type { FeedbackRawEvaluation, FeedbackWrittenEvaluation } from "./feedback.contract";

const identifierSchema = z.string().max(100);
const shortTextSchema = z.string().max(140);
const textSchema = z.string().max(320);
const detailedTextSchema = z.string().max(500);

const evidenceSchema = z.object({ segment_id: identifierSchema, quote: shortTextSchema });

const writtenCriterionSchema = z.object({
  feedback: textSchema,
  evidence: z.array(evidenceSchema).min(1).max(2),
});

const criterionSchema = z.object({
  score: z.number().int().min(0).max(4),
  ...writtenCriterionSchema.shape,
});

const correctionTextSchema = z.object({
  student_claim: textSchema,
  segment_id: identifierSchema,
  why_it_is_incorrect: detailedTextSchema,
  correct_explanation: detailedTextSchema,
  memory_hook: shortTextSchema.nullable(),
});

const understandingMapSchema = z
  .array(
    z.object({
      concept: shortTextSchema,
      status: z.enum(["correct", "partial", "incorrect", "missing"]),
      feedback: textSchema,
    }),
  )
  .max(6);

const reasoningAnalysisSchema = z.object({
  observed_approach: detailedTextSchema,
  what_worked: z.array(textSchema).max(3),
  where_it_broke: z
    .array(
      z.object({
        step: shortTextSchema,
        problem: textSchema,
        consequence: textSchema,
        better_connection: textSchema,
      }),
    )
    .max(2),
});

const strengthsSchema = z
  .array(
    z.object({
      title: shortTextSchema,
      detail: textSchema,
      evidence_segment_ids: z.array(identifierSchema).max(3),
    }),
  )
  .max(3);

const improvementPlanSchema = z
  .array(
    z.object({
      step: z.number().int().min(1),
      action: textSchema,
      success_criterion: textSchema,
    }),
  )
  .max(3);

const followUpQuestionsSchema = z.array(z.object({ question: textSchema, purpose: textSchema })).max(2);

export const feedbackRawEvaluationSchema = z.object({
  language: z.string().max(32),
  scorable: z.boolean(),
  insufficient_reason: textSchema.nullable(),
  headline: shortTextSchema,
  summary: detailedTextSchema,
  rubric: z.object({
    factual_accuracy: criterionSchema,
    coverage: criterionSchema,
    conceptual_reasoning: criterionSchema,
    clarity: criterionSchema,
  }),
  understanding_map: understandingMapSchema,
  reasoning_analysis: reasoningAnalysisSchema,
  corrections: z
    .array(
      z.object({
        priority: z.number().int().min(1),
        severity: z.enum(["minor", "important", "critical"]),
        ...correctionTextSchema.shape,
      }),
    )
    .max(3),
  strengths: strengthsSchema,
  improvement_plan: improvementPlanSchema,
  recommended_outline: z.array(textSchema).max(5),
  follow_up_questions: followUpQuestionsSchema,
  uncertainties: z.array(textSchema).max(2),
}) satisfies z.ZodType<FeedbackRawEvaluation>;

export const feedbackWrittenEvaluationSchema = z.object({
  language: z.string().max(32),
  insufficient_reason: textSchema.nullable(),
  headline: shortTextSchema,
  summary: detailedTextSchema,
  rubric: z.object({
    factual_accuracy: writtenCriterionSchema,
    coverage: writtenCriterionSchema,
    conceptual_reasoning: writtenCriterionSchema,
    clarity: writtenCriterionSchema,
  }),
  understanding_map: understandingMapSchema,
  reasoning_analysis: reasoningAnalysisSchema,
  corrections: z.array(correctionTextSchema).max(3),
  strengths: strengthsSchema,
  improvement_plan: improvementPlanSchema,
  recommended_outline: z.array(textSchema).max(5),
  follow_up_questions: followUpQuestionsSchema,
  uncertainties: z.array(textSchema).max(2),
}) satisfies z.ZodType<FeedbackWrittenEvaluation>;
