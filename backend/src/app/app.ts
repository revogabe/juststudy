import { Elysia, t } from "elysia";
import { createOpenApiModule } from "@/infrastructure/http/openapi";
import { createProblemModule } from "@/infrastructure/http/problem";
import { createAuthenticationModule } from "@/modules/authentication";
import { createBillingModule } from "@/modules/billing";
import { createFeedbackModule } from "@/modules/feedback";
import { createFocusModule } from "@/modules/focus";
import { createKnowledgeModule } from "@/modules/knowledge";
import { createRandomizeModule } from "@/modules/randomize";
import { createScoreModule } from "@/modules/score";
import type { Dependencies } from "./dependencies";
import type { Environment } from "./env";

type ApplicationInput = {
  environment: Environment;
  dependencies: Dependencies;
};

export function createApplication(input: ApplicationInput) {
  const authentication = createAuthenticationModule(input.dependencies.identity, {
    e2e_test_mode: input.environment.E2E_TEST_MODE,
  });
  const billing = createBillingModule({
    database: input.dependencies.database.client,
    payments: input.dependencies.payments,
    authentication: authentication.service,
    product_id: input.environment.POLAR_PRODUCT_ID,
    free_credits: input.environment.BILLING_FREE_CREDITS,
    e2e_test_mode: input.environment.E2E_TEST_MODE,
  });
  const knowledge = createKnowledgeModule({
    database: input.dependencies.database.client,
    catalog_token: input.environment.KNOWLEDGE_CATALOG_TOKEN,
    ai: input.dependencies.ai,
    prompts: input.dependencies.prompts,
    assessment_generation: input.environment.KNOWLEDGE_ASSESSMENT_GENERATION,
  });
  const randomize = createRandomizeModule({
    database: input.dependencies.database.client,
    authentication: authentication.service,
    knowledge: knowledge.service,
  });
  const focus = createFocusModule({
    database: input.dependencies.database.client,
    authentication: authentication.service,
    randomize: randomize.service,
  });
  const score = createScoreModule({
    database: input.dependencies.database.client,
    authentication: authentication.service,
    knowledge: knowledge.service,
  });
  const feedback = createFeedbackModule({
    database: input.dependencies.database.client,
    authentication: authentication.service,
    billing: billing.service,
    focus: focus.service,
    knowledge: knowledge.service,
    randomize: randomize.service,
    score: score.service,
    transcription: input.dependencies.transcription,
    ai: input.dependencies.ai,
    shadow_ai: input.dependencies.shadow_ai,
    decisions: input.dependencies.decisions,
    prompts: input.dependencies.prompts,
    shadow_mode: input.environment.FEEDBACK_SHADOW_MODE,
  });

  return new Elysia({ name: "juststudy" })
    .use(createProblemModule())
    .use(createOpenApiModule())
    .get(
      "/health",
      {
        response: t.Object({ status: t.Literal("ok") }),
        detail: { tags: ["Health"], summary: "Check process health" },
      },
      () => ({ status: "ok" }),
    )
    .use(authentication.plugin)
    .use(billing.plugin)
    .use(knowledge.plugin)
    .use(randomize.plugin)
    .use(focus.plugin)
    .use(score.plugin)
    .use(feedback.plugin)
    .setup(() => {
      focus.worker.start();
      feedback.worker.start();
      knowledge.worker.start();
    })
    .cleanup(async () => {
      await Promise.all([
        focus.worker.stop(),
        feedback.worker.stop(),
        knowledge.worker.stop(),
        input.dependencies.observability.shutdown(),
      ]);
    });
}

export type Application = ReturnType<typeof createApplication>;
