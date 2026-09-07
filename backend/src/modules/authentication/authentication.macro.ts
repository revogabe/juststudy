import { Elysia } from "elysia";
import type { AuthenticationService } from "./authentication.service";

export type AuthenticationLevel = "session" | "identified";

export function createAuthenticationMacro(service: AuthenticationService) {
  return new Elysia({ name: "authentication.macro" }).macro({
    auth(level: AuthenticationLevel) {
      return {
        async derive({ request }: { request: Request }) {
          if (level === "identified") {
            return service.session.identify(request.headers);
          }

          return service.session.get(request.headers);
        },
      };
    },
  });
}
