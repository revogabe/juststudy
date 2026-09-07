import type { KnowledgeCatalogUpdate } from "./knowledge.contract";
import {
  KnowledgeCatalogConflictError,
  KnowledgeSubjectNotFoundError,
  knowledgeError,
} from "./knowledge.error";
import { knowledgeCatalogRule } from "./knowledge.rule";
import type { KnowledgeStore } from "./store/knowledge.store";

type KnowledgeServiceInput = {
  store: KnowledgeStore;
};

export function createKnowledgeService(input: KnowledgeServiceInput) {
  return {
    subject: {
      get() {
        return input.store.subject.get();
      },
    },
    catalog: {
      async update(command: KnowledgeCatalogUpdate) {
        const catalog = knowledgeCatalogRule.validate(command);

        try {
          return await input.store.catalog.update(catalog);
        } catch (error) {
          if (error instanceof KnowledgeCatalogConflictError) throw knowledgeError.conflict();
          if (error instanceof KnowledgeSubjectNotFoundError) {
            throw knowledgeError.unbalanced(
              "Every topic batch must reference an existing subject.",
            );
          }

          throw error;
        }
      },
    },
  };
}

export type KnowledgeService = ReturnType<typeof createKnowledgeService>;
