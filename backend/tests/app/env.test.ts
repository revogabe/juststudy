import { describe, expect, it } from "bun:test";
import { createEnvironment } from "@/app/env";

describe("createEnvironment", () => {
  it("parses defaults and keeps public configuration explicit", () => {
    const environment = createEnvironment({
      APP_ENV: "test",
      DATABASE_URL: "postgres://localhost/juststudy_test",
      KNOWLEDGE_CATALOG_TOKEN: "test-knowledge-catalog-token-32-characters",
      AUTH_SECRET: "test-secret-with-at-least-32-characters",
    });

    expect(environment.APP_PORT).toBe(3000);
    expect(environment.EMAIL_PROVIDER).toBe("mailpit");
    expect(environment.BILLING_FREE_CREDITS).toBe(3);
  });

  it("refuses incomplete production provider configuration", () => {
    expect(() =>
      createEnvironment({
        APP_ENV: "production",
        DATABASE_URL: "postgres://localhost/juststudy",
        KNOWLEDGE_CATALOG_TOKEN: "production-knowledge-catalog-token-32-characters",
        AUTH_SECRET: "production-secret-with-at-least-32-characters",
      }),
    ).toThrow();
  });
});
