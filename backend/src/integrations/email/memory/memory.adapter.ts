import type { EmailMessage, EmailTransport } from "../email.contract";

export type MemoryEmailAdapter = EmailTransport & {
  delivery: {
    search(input?: { recipient?: string }): readonly EmailMessage[];
    delete(): void;
  };
};

export function createMemoryAdapter(): MemoryEmailAdapter {
  const messages: EmailMessage[] = [];

  return {
    delivery: {
      async create(message) {
        messages.push(message);

        return {
          delivery_id: Bun.randomUUIDv7(),
        };
      },
      search(input) {
        if (!input?.recipient) return [...messages];

        return messages.filter((message) => message.recipient === input.recipient);
      },
      delete() {
        messages.length = 0;
      },
    },
  };
}
