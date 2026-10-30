import type { ExtractionPath } from "@/features/bookings/schema";

import type { AiExtract, AiUsage } from "./ai";
import { parseEmail } from "./email";
import { extractors as registeredExtractors } from "./registry";
import type { ExtractedBooking, Extractor } from "./types";

export type ExtractionResult = {
  /** null when no extractor thought the email worth reading. */
  path: ExtractionPath | null;
  bookings: ExtractedBooking[];
  usage?: AiUsage;
};

export type PipelineOptions = {
  ai: AiExtract;
  extractors?: readonly Extractor[];
  /** Asked before any AI spend; false defers the email (e.g. the trip's daily cap is used up). */
  allowAi?: () => Promise<boolean>;
};

export class AiDeferred extends Error {}

/**
 * Raw email in, bookings out, without touching the database. Cheapest path first: skip
 * emails no extractor recognises, then use schema.org markup, and only then call Claude.
 */
export async function extractBookings(
  raw: Uint8Array,
  { ai, extractors = registeredExtractors, allowAi }: PipelineOptions,
): Promise<ExtractionResult> {
  const email = await parseEmail(raw);

  const candidates = extractors.filter((extractor) => extractor.mightContain(email));
  if (candidates.length === 0) return { path: null, bookings: [] };

  const fromMarkup = candidates.flatMap((extractor) => extractor.fromSchemaOrg(email.schemaOrg));
  if (fromMarkup.length > 0) return { path: "schema_org", bookings: fromMarkup };

  if (allowAi && !(await allowAi())) throw new AiDeferred("AI extraction is deferred");
  const { items, usage } = await ai(email, candidates);
  const bookings = items.flatMap((item) => {
    const kind = (item as { kind?: unknown }).kind;
    const extractor = candidates.find((candidate) => candidate.kind === kind);
    const booking = extractor?.fromAi(item, email);
    return booking ? [booking] : [];
  });
  return { path: "ai", bookings, usage };
}
