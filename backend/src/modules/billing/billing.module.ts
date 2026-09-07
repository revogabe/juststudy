import type { DatabaseClient } from "@/infrastructure/database";
import type { Payments } from "@/integrations/payments";
import type { AuthenticationService } from "@/modules/authentication";
import { createBillingRoutes } from "./billing.routes";
import { createBillingService } from "./billing.service";
import { createBillingStore } from "./billing.store";

type BillingModuleInput = {
  database: DatabaseClient;
  payments: Payments;
  authentication: AuthenticationService;
  product_id: string;
  free_credits: number;
};

export function createBillingModule(input: BillingModuleInput) {
  const store = createBillingStore(input.database);
  const service = createBillingService({
    store,
    payments: input.payments,
    product_id: input.product_id,
    free_credits: input.free_credits,
  });

  return {
    service,
    plugin: createBillingRoutes(service, input.authentication),
  };
}
