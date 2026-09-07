import { problemError } from "@/infrastructure/http/problem";

export class KnowledgeCatalogConflictError extends Error {}

export class KnowledgeSubjectNotFoundError extends Error {}

export const knowledgeError = {
  unauthorized() {
    return problemError.create({
      status: 401,
      code: "KNOWLEDGE_CATALOG_UNAUTHORIZED",
      title: "Knowledge catalog unauthorized",
      detail: "A valid knowledge catalog bearer token is required.",
    });
  },
  conflict() {
    return problemError.create({
      status: 409,
      code: "KNOWLEDGE_CATALOG_CONFLICT",
      title: "Knowledge catalog conflict",
      detail: "The catalog update overlaps with stored content or reuses an existing key.",
    });
  },
  unbalanced(detail: string) {
    return problemError.create({
      status: 422,
      code: "KNOWLEDGE_CATALOG_UNBALANCED",
      title: "Knowledge catalog unbalanced",
      detail,
    });
  },
};
