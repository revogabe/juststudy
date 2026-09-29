import type { Ai } from "@/integrations/ai";
import type { Prompts } from "@/integrations/prompts";
import {
  FEEDBACK_REVIEW_LOCAL_PROMPT,
  FEEDBACK_REVIEW_LOCAL_PROMPT_VERSION,
  FEEDBACK_REVIEW_PROMPT_LABEL,
  FEEDBACK_REVIEW_PROMPT_NAME,
  FEEDBACK_REVIEW_SCHEMA_VERSION,
  FEEDBACK_REVIEW_SYSTEM_PROMPT,
} from "@/prompts/feedback/explanation-review.prompt";
import type { FeedbackReview, FeedbackReviewInput, FeedbackReviewResult } from "./feedback.contract";
import { feedbackRawEvaluationSchema } from "./feedback-review.schema";

type FeedbackReviewServiceInput = {
  ai: Ai;
  prompts: Prompts;
};

export function createFeedbackReviewService(input: FeedbackReviewServiceInput): FeedbackReview {
  return {
    explanation: {
      async create(reviewInput): Promise<FeedbackReviewResult> {
        const prompt = await getPrompt(input.prompts, reviewInput);
        const result = await input.ai.structured.create({
          system: FEEDBACK_REVIEW_SYSTEM_PROMPT,
          prompt: prompt.text,
          output: {
            schema: feedbackRawEvaluationSchema,
            name: "explanation_evaluation",
            description: "Evidence-based structured educational feedback",
          },
          temperature: 0.1,
          max_output_tokens: 4000,
          function_id: "feedback.explanation.review",
          telemetry: {
            feedback_session_id: reviewInput.feedback_session_id,
            subject_slug: reviewInput.context.subject.slug,
            topic_slug: reviewInput.context.topic.slug,
            topic_level: reviewInput.context.topic.level,
            prompt_version: prompt.version,
            schema_version: FEEDBACK_REVIEW_SCHEMA_VERSION,
          },
        });

        return {
          evaluation_id: Bun.randomUUIDv7(),
          evaluation: result.output,
          provider: result.provider,
          model: result.model,
          prompt_version: prompt.version,
          schema_version: FEEDBACK_REVIEW_SCHEMA_VERSION,
          input_tokens: result.input_tokens,
          output_tokens: result.output_tokens,
          total_tokens: result.total_tokens,
          estimated_cost_usd: result.estimated_cost_usd,
          latency_ms: result.latency_ms,
        };
      },
    },
  };
}

function getPrompt(prompts: Prompts, input: FeedbackReviewInput) {
  return prompts.text.get({
    name: FEEDBACK_REVIEW_PROMPT_NAME,
    label: FEEDBACK_REVIEW_PROMPT_LABEL,
    fallback: FEEDBACK_REVIEW_LOCAL_PROMPT,
    fallback_version: FEEDBACK_REVIEW_LOCAL_PROMPT_VERSION,
    variables: {
      assessment_context: JSON.stringify(input.context.assessment),
      student_transcript: JSON.stringify(input.transcript.segments),
      output_language: input.transcript.language,
    },
  });
}
