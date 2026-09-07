export { createEmail } from "./email";
export type {
  Email,
  EmailDelivery,
  EmailDeliveryInput,
  EmailMessage,
  EmailTemplateData,
  EmailTemplateKey,
  EmailTransport,
} from "./email.contract";
export { EmailDeliveryError } from "./email.contract";
export { createMailpitAdapter } from "./mailpit/mailpit.adapter";
export type { MemoryEmailAdapter } from "./memory/memory.adapter";
export { createMemoryAdapter } from "./memory/memory.adapter";
export { createResendAdapter } from "./resend/resend.adapter";
