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

console.log(`JustStudy API listening at http://${environment.APP_HOST}:${environment.APP_PORT}`);

async function close(): Promise<void> {
  application.stop();
  await dependencies.database.connection.close();
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
