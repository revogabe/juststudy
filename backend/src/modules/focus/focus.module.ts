import type { DatabaseClient } from "@/infrastructure/database";
import type { AuthenticationService } from "@/modules/authentication";
import type { RandomizeService } from "@/modules/randomize";
import { createFocusRoutes } from "./focus.routes";
import { createFocusService } from "./focus.service";
import { createFocusStore } from "./focus.store";
import { createFocusWorker } from "./focus.worker";

type FocusModuleInput = {
  database: DatabaseClient;
  authentication: AuthenticationService;
  randomize: RandomizeService;
};

export function createFocusModule(input: FocusModuleInput) {
  const store = createFocusStore(input.database);
  const service = createFocusService({
    store,
    randomize: input.randomize,
  });

  return {
    service,
    worker: createFocusWorker(service),
    plugin: createFocusRoutes(service, input.authentication),
  };
}
