import type { DatabaseClient } from "@/infrastructure/database";
import { createKnowledgeRoutes } from "./knowledge.routes";
import { createKnowledgeService } from "./knowledge.service";
import { createKnowledgeStore } from "./store/knowledge.store";

type KnowledgeModuleInput = {
  database: DatabaseClient;
  catalog_token: string;
};

export function createKnowledgeModule(input: KnowledgeModuleInput) {
  const store = createKnowledgeStore(input.database);
  const service = createKnowledgeService({ store });

  return {
    service,
    plugin: createKnowledgeRoutes(service, input.catalog_token),
  };
}
