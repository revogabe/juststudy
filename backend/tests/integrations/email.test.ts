import { describe, expect, it } from "bun:test";
import { createEmail, createMemoryAdapter } from "@/integrations/email";

describe("email", () => {
  it("renders a domain template before delivering it", async () => {
    const transport = createMemoryAdapter();
    const email = createEmail(transport);

    await email.delivery.create({
      recipient: "learner@juststudy.test",
      template_key: "authentication.magic_link",
      template_data: {
        url: "https://api.juststudy.test/v1/auth/provider/magic-link/verify?token=token",
      },
    });

    const [message] = transport.delivery.search({
      recipient: "learner@juststudy.test",
    });

    expect(message?.subject).toBe("Your JustStudy sign-in link");
    expect(message?.text).toContain("token=token");
  });
});
