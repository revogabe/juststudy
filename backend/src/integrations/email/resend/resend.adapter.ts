import { Resend } from "resend";
import { EmailDeliveryError, type EmailTransport } from "../email.contract";

type ResendAdapterInput = {
  api_key: string;
  sender: string;
};

export function createResendAdapter(input: ResendAdapterInput): EmailTransport {
  const client = new Resend(input.api_key);

  return {
    delivery: {
      async create(message) {
        const result = await client.emails.send(
          {
            from: input.sender,
            to: message.recipient,
            subject: message.subject,
            text: message.text,
            html: message.html,
          },
          {
            idempotencyKey: message.idempotency_key,
          },
        );

        if (result.error) throw new EmailDeliveryError(result.error);

        return { delivery_id: result.data.id };
      },
    },
  };
}
