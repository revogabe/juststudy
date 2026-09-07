import { Elysia, t } from "elysia";
import { createOpenApiModule } from "@/infrastructure/http/openapi";
import { createProblemModule } from "@/infrastructure/http/problem";
import { createAuthenticationModule } from "@/modules/authentication";
import { createBillingModule } from "@/modules/billing";
import { createKnowledgeModule } from "@/modules/knowledge";
import type { Dependencies } from "./dependencies";
import type { Environment } from "./env";

type ApplicationInput = {
  environment: Environment;
  dependencies: Dependencies;
};

export function createApplication(input: ApplicationInput) {
  const authentication = createAuthenticationModule(input.dependencies.identity);
  const billing = createBillingModule({
    database: input.dependencies.database.client,
    payments: input.dependencies.payments,
    authentication: authentication.service,
    product_id: input.environment.POLAR_PRODUCT_ID,
    free_credits: input.environment.BILLING_FREE_CREDITS,
  });
  const knowledge = createKnowledgeModule({
    database: input.dependencies.database.client,
    catalog_token: input.environment.KNOWLEDGE_CATALOG_TOKEN,
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
    .use(knowledge.plugin);
}

export type Application = ReturnType<typeof createApplication>;
