import type { DatabaseClient } from "@/infrastructure/database";
import type { Ai } from "@/integrations/ai";
import type { Prompts } from "@/integrations/prompts";
import { createKnowledgeRoutes } from "./knowledge.routes";
import { createKnowledgeService } from "./knowledge.service";
import { createKnowledgeWorker } from "./knowledge.worker";
import { createKnowledgeAssessmentService } from "./knowledge-assessment.service";
import { createKnowledgeStore } from "./store/knowledge.store";

type KnowledgeModuleInput = {
  database: DatabaseClient;
  catalog_token: string;
  ai: Ai;
  prompts: Prompts;
  assessment_generation: boolean;
};

export function createKnowledgeModule(input: KnowledgeModuleInput) {
  const store = createKnowledgeStore(input.database);
  const writer = createKnowledgeAssessmentService({ ai: input.ai, prompts: input.prompts });
  const service = createKnowledgeService({ store, writer });

  return {
    service,
    worker: createKnowledgeWorker(service, input.assessment_generation),
    plugin: createKnowledgeRoutes(service, input.catalog_token),
  };
}
