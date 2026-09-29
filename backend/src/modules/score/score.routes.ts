import { Elysia } from "elysia";
import { type AuthenticationService, createAuthenticationMacro } from "@/modules/authentication";
import { scoresSchema } from "./score.schema";
import type { ScoreService } from "./score.service";

export function createScoreRoutes(service: ScoreService, authentication: AuthenticationService) {
  return new Elysia({ name: "score.routes", prefix: "/v1/scores" }).use(createAuthenticationMacro(authentication)).get(
    "",
    {
      auth: "identified",
      response: scoresSchema,
      detail: { tags: ["Scores"], summary: "Get subject scores" },
    },
    async ({ user }) => ({
      subjects: (await service.subject.get(user.id)).map((subject) => ({
        ...subject,
        updated_at: subject.updated_at.getTime() === 0 ? null : subject.updated_at.toISOString(),
      })),
    }),
  );
}
