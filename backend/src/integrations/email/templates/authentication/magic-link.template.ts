import type { EmailMessage } from "../../email.contract";

type MagicLinkTemplateInput = {
  recipient: string;
  url: string;
};

function createIdempotencyKey(url: string): string {
  const token = new URL(url).searchParams.get("token");

  if (token) return `authentication.magic_link/${token}`;

  return `authentication.magic_link/${Bun.hash(url).toString(36)}`;
}

export function createMagicLinkTemplate(input: MagicLinkTemplateInput): EmailMessage {
  const text = [
    "Open this link to sign in to JustStudy:",
    input.url,
    "",
    "The link works once and expires shortly.",
    "If you did not request it, ignore this email.",
  ].join("\n");

  return {
    recipient: input.recipient,
    subject: "Your JustStudy sign-in link",
    text,
    html: `<p>Open this link to sign in to JustStudy:</p><p><a href="${input.url}">${input.url}</a></p><p>The link works once and expires shortly.</p>`,
    idempotency_key: createIdempotencyKey(input.url),
  };
}
