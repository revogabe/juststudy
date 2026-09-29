import { Elysia } from "elysia";
import type { Identity } from "@/integrations/identity";
import { createAuthenticationRoutes } from "./authentication.routes";
import { createAuthenticationService } from "./authentication.service";

type AuthenticationModuleOptions = {
  e2e_test_mode?: boolean;
};

export function createAuthenticationModule(identity: Identity, options: AuthenticationModuleOptions = {}) {
  const service = createAuthenticationService(identity, options);

  return {
    service,
    plugin: new Elysia({ name: "authentication.module" }).use(createAuthenticationRoutes(service)),
  };
}
