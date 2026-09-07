import { t } from "elysia";

export const identityUserSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  email_verified: t.Boolean(),
  image: t.Nullable(t.String()),
  is_anonymous: t.Boolean(),
});

export const sessionSchema = t.Object({
  user: identityUserSchema,
  session: t.Object({
    id: t.String(),
    user_id: t.String(),
    expires_at: t.String({ format: "date-time" }),
  }),
});

export const magicLinkInputSchema = t.Object({
  email: t.String({ format: "email" }),
  callback_url: t.String({ format: "uri" }),
});

export const googleInputSchema = t.Object({
  callback_url: t.String({ format: "uri" }),
});
