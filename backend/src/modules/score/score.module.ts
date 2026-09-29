import type { DatabaseClient } from "@/infrastructure/database";
import type { AuthenticationService } from "@/modules/authentication";
import type { KnowledgeService } from "@/modules/knowledge";
import { createScoreRoutes } from "./score.routes";
import { createScoreService } from "./score.service";
import { createScoreStore } from "./score.store";

type ScoreModuleInput = {
  database: DatabaseClient;
  authentication: AuthenticationService;
  knowledge: KnowledgeService;
};

export function createScoreModule(input: ScoreModuleInput) {
  const store = createScoreStore(input.database);
  const service = createScoreService({ store, knowledge: input.knowledge });

  return {
    service,
    plugin: createScoreRoutes(service, input.authentication),
  };
}
