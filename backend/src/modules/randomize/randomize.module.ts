import type { DatabaseClient } from "@/infrastructure/database";
import type { AuthenticationService } from "@/modules/authentication";
import type { KnowledgeService } from "@/modules/knowledge";
import { createRandomizeRoutes } from "./randomize.routes";
import { createRandomizeService } from "./randomize.service";
import { createRandomizeStore } from "./randomize.store";

type RandomizeModuleInput = {
  database: DatabaseClient;
  authentication: AuthenticationService;
  knowledge: KnowledgeService;
};

export function createRandomizeModule(input: RandomizeModuleInput) {
  const store = createRandomizeStore(input.database);
  const service = createRandomizeService({
    store,
    knowledge: input.knowledge,
  });

  return {
    plugin: createRandomizeRoutes(service, input.authentication),
  };
}
