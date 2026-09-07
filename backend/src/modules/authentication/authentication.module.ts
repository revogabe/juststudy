import { Elysia } from "elysia";
import type { Identity } from "@/integrations/identity";
import { createAuthenticationRoutes } from "./authentication.routes";
import { createAuthenticationService } from "./authentication.service";

export function createAuthenticationModule(identity: Identity) {
  const service = createAuthenticationService(identity);

  return {
    service,
    plugin: new Elysia({ name: "authentication.module" }).use(createAuthenticationRoutes(service)),
  };
}
