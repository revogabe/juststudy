import type {
  Email,
  EmailDeliveryInput,
  EmailMessage,
  EmailTemplateKey,
  EmailTransport,
} from "./email.contract";
import { createMagicLinkTemplate } from "./templates/authentication/magic-link.template";

function createTemplate<Key extends EmailTemplateKey>(
  input: EmailDeliveryInput<Key>,
): EmailMessage {
  if (input.template_key === "authentication.magic_link") {
    return createMagicLinkTemplate({
      recipient: input.recipient,
      url: input.template_data.url,
    });
  }

  const unsupportedTemplate: never = input.template_key;
  throw new Error(`Unsupported email template: ${unsupportedTemplate}`);
}

export function createEmail(transport: EmailTransport): Email {
  return {
    delivery: {
      create(input) {
        return transport.delivery.create(createTemplate(input));
      },
    },
  };
}
