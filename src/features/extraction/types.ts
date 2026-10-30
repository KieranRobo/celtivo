import type { z } from "zod";

import type { db } from "@/db";

import type { BookingKind, ExtractionPath } from "@/features/bookings/schema";
import type { ParsedEmail } from "./email";
import type { SchemaOrgNode } from "./schema-org";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SaveContext = {
  tripId: string;
  emailId: string;
  path: ExtractionPath;
};

/** "added" is a new booking; "matched" means the trip already had it (same reference). */
export type SaveOutcome = "added" | "matched";

/**
 * A booking read from an email, ready to save. The kind-specific type stays inside its
 * extractor: the pipeline only needs to print it and save it.
 */
export type ExtractedBooking = {
  kind: BookingKind;
  /** The normalised booking, for logs and `pnpm extract`. */
  booking: unknown;
  save(tx: Transaction, context: SaveContext): Promise<SaveOutcome>;
};

/**
 * One booking kind's knowledge: how to spot it, read it from schema.org markup or from
 * Claude's output, and save it. Adding a kind means adding an extractor to the registry;
 * the pipeline and job don't change.
 */
export type Extractor = {
  kind: BookingKind;
  /**
   * A cheap check before any AI spend: could this email hold a booking of this kind? It
   * should err towards yes; Claude makes the real call.
   */
  mightContain(email: ParsedEmail): boolean;
  /** Bookings found in schema.org markup, or [] when there's none (or it's unusable). */
  fromSchemaOrg(nodes: SchemaOrgNode[]): ExtractedBooking[];
  /**
   * What Claude should return for one booking of this kind. Must have a `kind` literal so
   * the combined schema can tell kinds apart. Keep it loose: structured outputs can't
   * express patterns, so strict checks belong in `fromAi`.
   */
  aiSchema: z.ZodObject<{ kind: z.ZodLiteral<BookingKind> } & z.ZodRawShape>;
  /** Kind-specific guidance appended to the extraction prompt. */
  aiInstructions: string;
  /** Validates and normalises one item Claude returned; null drops it. */
  fromAi(output: unknown, email: ParsedEmail): ExtractedBooking | null;
};
