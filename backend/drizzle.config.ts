import { defineConfig } from "drizzle-kit";
import { createEnvironment } from "./src/app/env";

const environment = createEnvironment();

export default defineConfig({
  schema: ["./src/modules/**/*.model.ts"],
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: environment.DATABASE_URL,
  },
});
