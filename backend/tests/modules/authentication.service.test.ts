import { describe, expect, it } from "bun:test";
import { ProblemError } from "@/infrastructure/http/problem";
import type { Identity, IdentitySessionContext } from "@/integrations/identity";
import { createAuthenticationService } from "@/modules/authentication/authentication.service";

function identityWithSession(session: IdentitySessionContext | null): Identity {
  return {
    anonymous: {
      async create() {
        throw new Error("Not used by this test");
      },
    },
    magicLink: {
      async create() {
        throw new Error("Not used by this test");
      },
    },
    google: {
      async create() {
        throw new Error("Not used by this test");
      },
    },
    session: {
      async get() {
        return session;
      },
      async delete() {
        return {
          body: { signed_out: true },
          headers: new Headers(),
        };
      },
    },
    provider: {
      async handle() {
        return new Response();
      },
    },
  };
}

const anonymousSession: IdentitySessionContext = {
  user: {
    id: "user-1",
    name: "Anonymous",
    email: "anonymous@juststudy.test",
    email_verified: false,
    image: null,
    is_anonymous: true,
  },
  session: {
    id: "session-1",
    user_id: "user-1",
    expires_at: new Date("2026-09-10T00:00:00.000Z"),
  },
};

describe("authentication service", () => {
  it("requires a session", async () => {
    const service = createAuthenticationService(identityWithSession(null));

    await expect(service.session.get(new Headers())).rejects.toBeInstanceOf(ProblemError);
  });

  it("separates authenticated and identified access", async () => {
    const service = createAuthenticationService(identityWithSession(anonymousSession));

    await expect(service.session.get(new Headers())).resolves.toEqual(anonymousSession);
    await expect(service.session.identify(new Headers())).rejects.toMatchObject({
      code: "IDENTIFIED_USER_REQUIRED",
    });
  });
});
