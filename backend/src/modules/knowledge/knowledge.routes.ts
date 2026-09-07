import { timingSafeEqual } from "node:crypto";
import { Elysia, t } from "elysia";
import { knowledgeError } from "./knowledge.error";
import {
  knowledgeCatalogInputSchema,
  knowledgeCatalogResultSchema,
  knowledgeSubjectsSchema,
} from "./knowledge.schema";
import type { KnowledgeService } from "./knowledge.service";

export function createKnowledgeRoutes(service: KnowledgeService, catalogToken: string) {
  return new Elysia({ name: "knowledge.routes", prefix: "/v1/knowledge" })
    .get(
      "/subjects",
      {
        response: knowledgeSubjectsSchema,
        detail: { tags: ["Knowledge"], summary: "List knowledge subjects" },
      },
      async () => ({ subjects: await service.subject.get() }),
    )
    .post(
      "/catalog",
      {
        headers: t.Object({ authorization: t.Optional(t.String()) }),
        body: knowledgeCatalogInputSchema,
        response: knowledgeCatalogResultSchema,
        detail: { tags: ["Knowledge"], summary: "Add to the knowledge catalog" },
      },
      async ({ body, headers }) => {
        if (!isAuthorized(headers.authorization, catalogToken)) throw knowledgeError.unauthorized();

        return service.catalog.update(body);
      },
    );
}

function isAuthorized(authorization: string | undefined, catalogToken: string): boolean {
  if (!authorization) return false;

  const received = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${catalogToken}`);

  if (received.length !== expected.length) return false;

  return timingSafeEqual(received, expected);
}
