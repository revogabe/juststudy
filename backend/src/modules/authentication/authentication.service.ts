import type { Identity } from "@/integrations/identity";
import { authenticationError } from "./authentication.error";

export function createAuthenticationService(identity: Identity) {
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

        if (session.user.is_anonymous) throw authenticationError.identifiedUserRequired();

        return session;
      },
      delete: identity.session.delete,
    },
  };
}

export type AuthenticationService = ReturnType<typeof createAuthenticationService>;
