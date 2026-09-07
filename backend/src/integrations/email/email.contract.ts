export type EmailTemplateKey = "authentication.magic_link";

export type EmailTemplateData = {
  "authentication.magic_link": {
    url: string;
  };
};

export type EmailDeliveryInput<Key extends EmailTemplateKey = EmailTemplateKey> = {
  recipient: string;
  template_key: Key;
  template_data: EmailTemplateData[Key];
};

export type EmailDelivery = {
  delivery_id: string;
};

export class EmailDeliveryError extends Error {
  constructor(cause?: unknown) {
    super("The email provider could not deliver the message", { cause });
    this.name = "EmailDeliveryError";
  }
}

export type EmailMessage = {
  recipient: string;
  subject: string;
  text: string;
  html: string;
  idempotency_key: string;
};

export type EmailTransport = {
  delivery: {
    create(message: EmailMessage): Promise<EmailDelivery>;
  };
};

export type Email = {
  delivery: {
    create<Key extends EmailTemplateKey>(input: EmailDeliveryInput<Key>): Promise<EmailDelivery>;
  };
};
