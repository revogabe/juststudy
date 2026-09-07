import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, magicLink } from "better-auth/plugins";
import type { DatabaseClient } from "@/infrastructure/database";
import type { Email } from "@/integrations/email";
import type {
  Identity,
  IdentitySession,
  IdentitySessionContext,
  IdentityUser,
} from "../identity.contract";

type BetterAuthAdapterInput = {
  base_url: string;
  secret: string;
  trusted_origins: string[];
  google_client_id: string;
  google_client_secret: string;
  database: DatabaseClient;
  schema: Record<string, unknown>;
  email: Email;
};

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null | undefined;
  isAnonymous?: boolean | null | undefined;
};

type BetterAuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
};

function toIdentityUser(user: BetterAuthUser): IdentityUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified: user.emailVerified,
    image: user.image ?? null,
    is_anonymous: user.isAnonymous ?? false,
  };
}

function toIdentitySession(session: BetterAuthSession): IdentitySession {
  return {
    id: session.id,
    user_id: session.userId,
    expires_at: session.expiresAt,
  };
}

function toIdentitySessionContext(input: {
  user: BetterAuthUser;
  session: BetterAuthSession;
}): IdentitySessionContext {
  return {
    user: toIdentityUser(input.user),
    session: toIdentitySession(input.session),
  };
}

export function createBetterAuthAdapter(input: BetterAuthAdapterInput): Identity {
  const auth = betterAuth({
    appName: "JustStudy",
    baseURL: input.base_url,
    basePath: "/v1/auth/provider",
    secret: input.secret,
    trustedOrigins: input.trusted_origins,
    database: drizzleAdapter(input.database, {
      provider: "pg",
      usePlural: true,
      schema: input.schema,
    }),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: input.google_client_id,
        clientSecret: input.google_client_secret,
      },
    },
    user: {
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    session: {
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
      },
    },
    account: {
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    plugins: [
      anonymous({
        schema: {
          user: {
            fields: {
              isAnonymous: "is_anonymous",
            },
          },
        },
      }),
      magicLink({
        async sendMagicLink({ email, url }) {
          await input.email.delivery.create({
            recipient: email,
            template_key: "authentication.magic_link",
            template_data: { url },
          });
        },
      }),
    ],
  });

  return {
    anonymous: {
      async create(headers) {
        const result = await auth.api.signInAnonymous({
          headers,
          returnHeaders: true,
        });

        return {
          body: {
            user: toIdentityUser(result.response.user),
          },
          headers: result.headers,
        };
      },
    },
    magicLink: {
      async create(request) {
        const result = await auth.api.signInMagicLink({
          headers: request.headers,
          body: {
            email: request.email,
            callbackURL: request.callback_url,
          },
          returnHeaders: true,
        });

        return {
          body: { accepted: true },
          headers: result.headers,
        };
      },
    },
    google: {
      async create(request) {
        const result = await auth.api.signInSocial({
          headers: request.headers,
          body: {
            provider: "google",
            callbackURL: request.callback_url,
          },
          returnHeaders: true,
        });

        if (!result.response.url) throw new Error("Google sign-in did not return a redirect URL.");

        return {
          body: { redirect_url: result.response.url },
          headers: result.headers,
        };
      },
    },
    session: {
      async get(headers) {
        const result = await auth.api.getSession({ headers });

        if (!result) return null;

        return toIdentitySessionContext(result);
      },
      async delete(headers) {
        const result = await auth.api.signOut({
          headers,
          returnHeaders: true,
        });

        return {
          body: { signed_out: true },
          headers: result.headers,
        };
      },
    },
    provider: {
      handle(request) {
        return auth.handler(request);
      },
    },
  };
}
