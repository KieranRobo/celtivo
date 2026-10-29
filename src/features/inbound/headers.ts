import PostalMime from "postal-mime";

export type EmailHeaders = {
  subject?: string;
  messageId?: string;
  sentAt?: Date;
  fromAddress?: string;
  fromName?: string;
  authResults?: string;
};

/**
 * Reads the fields we keep from a raw header block (everything before the first blank line).
 * postal-mime decodes encoded words ("=?UTF-8?B?…?=") and unfolds long headers.
 */
export async function parseHeaders(block: string): Promise<EmailHeaders> {
  // A blank line ends the headers; without one postal-mime would read the last header as body.
  const email = await PostalMime.parse(`${block.replace(/\r?\n$/, "")}\r\n\r\n`);
  const sentAt = email.date ? new Date(email.date) : undefined;
  const authResults = email.headers
    .filter((header) => header.key === "authentication-results")
    .map((header) => header.value)
    .join("\n");

  return {
    subject: email.subject || undefined,
    messageId: email.messageId || undefined,
    sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : undefined,
    fromAddress: email.from?.address || undefined,
    fromName: email.from?.name || undefined,
    authResults: authResults || undefined,
  };
}
