import type { Identity } from "@/integrations/identity";
import { authenticationError } from "./authentication.error";

type AuthenticationServiceOptions = {
  e2e_test_mode?: boolean;
};

export function createAuthenticationService(identity: Identity, options: AuthenticationServiceOptions = {}) {
  return {
    anonymous: identity.anonymous,
    magicLink: identity.magicLink,
    google: identity.google,
    provider: identity.provider,
    session: {
      async get(headers: Headers) {
        const session = await identity.session.get(headers);

        if (!session) throw authenticationError.unauthenticated();

        return session;
      },
      async identify(headers: Headers) {
        const session = await identity.session.get(headers);

        if (!session) throw authenticationError.unauthenticated();

        if (session.user.is_anonymous && !options.e2e_test_mode) throw authenticationError.identifiedUserRequired();

        return session;
      },
      delete: identity.session.delete,
    },
  };
}

export type AuthenticationService = ReturnType<typeof createAuthenticationService>;
