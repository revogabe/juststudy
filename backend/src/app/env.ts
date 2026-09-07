import { z } from "zod";

const environmentSchema = z
  .object({
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_HOST: z.string().min(1).default("127.0.0.1"),
    APP_PORT: z.coerce.number().int().positive().default(3000),
    APP_BASE_URL: z.url().default("http://127.0.0.1:3000"),
    APP_WEB_URL: z.url().default("http://localhost:3001"),

    DATABASE_URL: z.string().min(1),

    AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().default(""),
    GOOGLE_CLIENT_SECRET: z.string().default(""),

    EMAIL_PROVIDER: z.enum(["mailpit", "memory", "resend"]).default("mailpit"),
    EMAIL_FROM: z.email().default("no-reply@juststudy.test"),
    RESEND_API_KEY: z.string().default(""),
    MAILPIT_URL: z.url().default("http://127.0.0.1:8025"),

    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_ACCESS_TOKEN: z.string().default(""),
    POLAR_WEBHOOK_SECRET: z.string().default(""),
    POLAR_PRODUCT_ID: z.string().default(""),
    BILLING_FREE_CREDITS: z.coerce.number().int().nonnegative().default(3),
    POLAR_SUCCESS_URL: z
      .string()
      .min(1)
      .default("http://localhost:3001/billing/success?checkout_id={CHECKOUT_ID}"),
    POLAR_RETURN_URL: z.url().default("http://localhost:3001/settings/billing"),
  })
  .superRefine((environment, context) => {
    if (environment.APP_ENV !== "production") return;

    const required: Array<[string, string]> = [
      ["GOOGLE_CLIENT_ID", environment.GOOGLE_CLIENT_ID],
      ["GOOGLE_CLIENT_SECRET", environment.GOOGLE_CLIENT_SECRET],
      ["POLAR_ACCESS_TOKEN", environment.POLAR_ACCESS_TOKEN],
      ["POLAR_WEBHOOK_SECRET", environment.POLAR_WEBHOOK_SECRET],
      ["POLAR_PRODUCT_ID", environment.POLAR_PRODUCT_ID],
    ];

    if (environment.EMAIL_PROVIDER === "resend") {
      required.push(["RESEND_API_KEY", environment.RESEND_API_KEY]);
    }

    for (const [key, value] of required) {
      if (value) continue;

      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required in production`,
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

function removeBlankValues(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value || undefined]),
  );
}

export function createEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(removeBlankValues(source));
}
