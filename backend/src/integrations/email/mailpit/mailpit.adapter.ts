import { EmailDeliveryError, type EmailTransport } from "../email.contract";

type MailpitAdapterInput = {
  base_url: string;
  sender: string;
};

export function createMailpitAdapter(input: MailpitAdapterInput): EmailTransport {
  return {
    delivery: {
      async create(message) {
        const response = await fetch(`${input.base_url}/api/v1/send`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            From: { Email: input.sender },
            To: [{ Email: message.recipient }],
            Subject: message.subject,
            Text: message.text,
            HTML: message.html,
          }),
        });

        if (!response.ok) {
          throw new EmailDeliveryError();
        }

        return {
          delivery_id: response.headers.get("x-message-id") ?? Bun.randomUUIDv7(),
        };
      },
    },
  };
}
