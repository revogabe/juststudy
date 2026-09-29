import type { DatabaseClient } from "@/infrastructure/database";
import type { Ai } from "@/integrations/ai";
import type { Decisions } from "@/integrations/decisions";
import type { Prompts } from "@/integrations/prompts";
import type { Transcription } from "@/integrations/transcription";
import type { AuthenticationService } from "@/modules/authentication";
import type { BillingService } from "@/modules/billing";
import type { FocusService } from "@/modules/focus";
import type { KnowledgeService } from "@/modules/knowledge";
import type { RandomizeService } from "@/modules/randomize";
import type { ScoreService } from "@/modules/score";
import type { FeedbackReview, FeedbackShadowMode, FeedbackShadowReviewer } from "./feedback.contract";
import { createFeedbackRoutes } from "./feedback.routes";
import { createFeedbackService } from "./feedback.service";
import { createFeedbackStore } from "./feedback.store";
import { createFeedbackWorker } from "./feedback.worker";
import { createFeedbackDecisionService } from "./feedback-decision.service";
import { createFeedbackHybridReviewService } from "./feedback-hybrid-review.service";
import { createFeedbackReviewService } from "./feedback-review.service";

type FeedbackModuleInput = {
  database: DatabaseClient;
  authentication: AuthenticationService;
  billing: BillingService;
  focus: FocusService;
  knowledge: KnowledgeService;
  randomize: RandomizeService;
  score: ScoreService;
  transcription: Transcription;
  ai: Ai;
  shadow_ai: Ai;
  decisions: Decisions | null;
  prompts: Prompts;
  shadow_mode: FeedbackShadowMode | "none";
};

export function createFeedbackModule(input: FeedbackModuleInput) {
  const store = createFeedbackStore(input.database);
  const decision = input.decisions ? createFeedbackDecisionService({ decisions: input.decisions }) : null;
  const llmReview = createFeedbackReviewService({ ai: input.ai, prompts: input.prompts });
  const review: FeedbackReview = decision
    ? createFeedbackHybridReviewService({ decision, ai: input.ai, prompts: input.prompts, fallback: llmReview })
    : llmReview;
  const service = createFeedbackService({
    store,
    transcription: input.transcription,
    review,
    billing: input.billing,
    focus: input.focus,
    knowledge: input.knowledge,
    randomize: input.randomize,
    score: input.score,
    shadow: shadowReviewer(input, decision),
  });

  return {
    service,
    worker: createFeedbackWorker(service),
    plugin: createFeedbackRoutes(service, input.authentication),
  };
}

function shadowReviewer(
  input: FeedbackModuleInput,
  decision: ReturnType<typeof createFeedbackDecisionService> | null,
): FeedbackShadowReviewer | null {
  if (input.shadow_mode === "none") return null;

  const shadowReview = createFeedbackReviewService({ ai: input.shadow_ai, prompts: input.prompts });
  if (input.shadow_mode === "llm") return { mode: "llm", review: shadowReview };
  if (!decision) return null;
  if (input.shadow_mode === "decision") return { mode: "decision", review: decision };

  return {
    mode: "hybrid",
    review: createFeedbackHybridReviewService({ decision, ai: input.shadow_ai, prompts: input.prompts, fallback: shadowReview }),
  };
}
