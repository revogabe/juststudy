import { Elysia, t } from "elysia";
import { createAuthenticationMacro } from "./authentication.macro";
import {
  googleInputSchema,
  identityUserSchema,
  magicLinkInputSchema,
  sessionSchema,
} from "./authentication.schema";
import type { AuthenticationService } from "./authentication.service";

function applyHeaders(target: Record<string, string | number | string[]>, source: Headers): void {
  source.forEach((value, key) => {
    target[key] = value;
  });
}

export function createAuthenticationRoutes(service: AuthenticationService) {
  return new Elysia({ name: "authentication.routes", prefix: "/v1/auth" })
    .use(createAuthenticationMacro(service))
    .post(
      "/anonymous",
      {
        response: t.Object({ user: identityUserSchema }),
        detail: { tags: ["Authentication"], summary: "Create an anonymous session" },
      },
      async ({ request, set }) => {
        const result = await service.anonymous.create(request.headers);
        applyHeaders(set.headers, result.headers);
        return result.body;
      },
    )
    .post(
      "/magic-link",
      {
        body: magicLinkInputSchema,
        response: t.Object({ accepted: t.Literal(true) }),
        detail: { tags: ["Authentication"], summary: "Send a magic link" },
      },
      async ({ body, request, set }) => {
        const result = await service.magicLink.create({
          headers: request.headers,
          email: body.email,
          callback_url: body.callback_url,
        });
        applyHeaders(set.headers, result.headers);
        return result.body;
      },
    )
    .post(
      "/google",
      {
        body: googleInputSchema,
        response: t.Object({ redirect_url: t.String({ format: "uri" }) }),
        detail: { tags: ["Authentication"], summary: "Start Google sign-in" },
      },
      async ({ body, request, set }) => {
        const result = await service.google.create({
          headers: request.headers,
          callback_url: body.callback_url,
        });
        applyHeaders(set.headers, result.headers);
        return result.body;
      },
    )
    .get(
      "/session",
      {
        auth: "session",
        response: sessionSchema,
        detail: { tags: ["Authentication"], summary: "Get the current session" },
      },
      ({ user, session }) => {
        return {
          user,
          session: {
            ...session,
            expires_at: session.expires_at.toISOString(),
          },
        };
      },
    )
    .delete(
      "/session",
      {
        response: t.Object({ signed_out: t.Literal(true) }),
        detail: { tags: ["Authentication"], summary: "Delete the current session" },
      },
      async ({ request, set }) => {
        const result = await service.session.delete(request.headers);
        applyHeaders(set.headers, result.headers);
        return result.body;
      },
    )
    .all(
      "/provider/*",
      {
        detail: {
          hide: true,
        },
      },
      ({ request }) => service.provider.handle(request),
    );
}
