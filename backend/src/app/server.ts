import { createApplication } from "./app";
import { createDependencies } from "./dependencies";
import { createEnvironment } from "./env";

const environment = createEnvironment();
const dependencies = createDependencies(environment);
const application = createApplication({ environment, dependencies });

application.listen({
  hostname: environment.APP_HOST,
  port: environment.APP_PORT,
});

console.log(
  [
    "JustStudy development services",
    `API:            ${environment.APP_BASE_URL}`,
    `OpenAPI:        ${new URL("/docs", environment.APP_BASE_URL)}`,
    `Mailpit:        ${environment.MAILPIT_URL}`,
    "Drizzle Studio: https://local.drizzle.studio",
  ].join("\n"),
);

async function close(): Promise<void> {
  application.stop();
  await dependencies.database.connection.close();
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
