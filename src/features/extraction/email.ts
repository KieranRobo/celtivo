import { convert } from "html-to-text";
import PostalMime from "postal-mime";

import { findSchemaOrgNodes, type SchemaOrgNode } from "./schema-org";

/** What extractors see of an email: never the raw MIME. */
export type ParsedEmail = {
  subject: string;
  from: string;
  /** When it was sent, which helps resolve dates written without a year. */
  sentAt?: Date;
  /** Plain text: the text part, or the HTML converted to text when that's all there is. */
  text: string;
  /** schema.org objects embedded as JSON-LD (FlightReservation and friends). */
  schemaOrg: SchemaOrgNode[];
};

export async function parseEmail(raw: Uint8Array): Promise<ParsedEmail> {
  const email = await PostalMime.parse(raw);
  const html = email.html ?? "";
  // Prefer text rendered from the HTML: booking emails' text parts are often a stub.
  const text = html ? htmlToText(html) : (email.text ?? "");
  const sentAt = email.date ? new Date(email.date) : undefined;

  return {
    subject: email.subject ?? "",
    from: email.from?.address ?? "",
    sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : undefined,
    text: text.trim(),
    schemaOrg: findSchemaOrgNodes(html),
  };
}

function htmlToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      // Links and images are noise for extraction and cost tokens.
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });
}
