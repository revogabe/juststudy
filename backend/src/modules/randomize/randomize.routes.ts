import { Elysia } from "elysia";
import { type AuthenticationService, createAuthenticationMacro } from "@/modules/authentication";
import type { TopicRandomization } from "./randomize.contract";
import {
  randomizeHistoryQuerySchema,
  randomizeHistorySchema,
  randomizeTopicInputSchema,
  randomizeTopicSchema,
} from "./randomize.schema";
import type { RandomizeService } from "./randomize.service";

const HISTORY_DEFAULT_LIMIT = 20;

export function createRandomizeRoutes(
  service: RandomizeService,
  authentication: AuthenticationService,
) {
  return new Elysia({ name: "randomize.routes", prefix: "/v1/randomize" })
    .use(createAuthenticationMacro(authentication))
    .post(
      "/topic",
      {
        auth: "session",
        body: randomizeTopicInputSchema,
        response: randomizeTopicSchema,
        detail: { tags: ["Randomize"], summary: "Randomize a topic" },
      },
      async ({ body, user }) => {
        const randomization = await service.topic.create({
          user_id: user.id,
          subject_slug: body.subject_slug ?? null,
        });

        return toRandomizationResponse(randomization);
      },
    )
    .get(
      "/history",
      {
        auth: "session",
        query: randomizeHistoryQuerySchema,
        response: randomizeHistorySchema,
        detail: { tags: ["Randomize"], summary: "Get the randomization history" },
      },
      async ({ query, user }) => {
        const history = await service.history.search({
          user_id: user.id,
          limit: query.limit ?? HISTORY_DEFAULT_LIMIT,
          cursor: query.cursor ?? null,
        });

        return {
          randomizations: history.randomizations.map(toRandomizationResponse),
          next_cursor: history.next_cursor,
        };
      },
    );
}

function toRandomizationResponse<Randomization extends TopicRandomization>(
  randomization: Randomization,
) {
  return {
    ...randomization,
    created_at: randomization.created_at.toISOString(),
    updated_at: randomization.updated_at.toISOString(),
  };
}
