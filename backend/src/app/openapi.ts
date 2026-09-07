import { createApplication } from "./app";
import { createDependencies } from "./dependencies";
import { createEnvironment } from "./env";

const environment = createEnvironment();
const dependencies = createDependencies(environment);
const application = createApplication({ environment, dependencies });
const response = await application.handle(new Request(`${environment.APP_BASE_URL}/openapi.json`));

if (!response.ok) throw new Error(`OpenAPI generation failed with status ${response.status}.`);

await Bun.write("generated/openapi.json", await response.text());
await dependencies.database.connection.close();

console.log("Generated backend/generated/openapi.json");
