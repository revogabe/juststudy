process.env.APP_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://juststudy:juststudy@127.0.0.1:5432/juststudy_test";
process.env.KNOWLEDGE_CATALOG_TOKEN ??= "test-knowledge-catalog-token-32-characters";
process.env.AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.EMAIL_PROVIDER ??= "memory";
