import { z } from "zod";

/** Matches HEADER_BLOCK_LIMIT in workers/inbound-email/src/inbound.ts. */
const HEADER_BLOCK_LIMIT = 64 * 1024;

/**
 * What the Email Worker (and `pnpm inbound:send`) POSTs to /api/inbound/email once the raw
 * message is in storage. Mirrors `InboundNotice` in workers/inbound-email/src/inbound.ts.
 */
export const inboundNoticeSchema = z.object({
  key: z.string().min(1).max(512),
  to: z.string().min(1).max(512),
  from: z.string().max(512),
  rawSize: z.number().int().nonnegative(),
  headers: z.string().max(HEADER_BLOCK_LIMIT),
});

export type InboundNotice = z.infer<typeof inboundNoticeSchema>;

/**
 * Where an email is in extraction. The extraction job claims "received" rows (see
 * features/extraction/job.ts):
 * - extracting: claimed by the job; `lockedUntil` lets another run take over if it dies
 * - extracted: at least one booking was saved (or matched one already on the trip)
 * - ignored: not a booking we handle
 * - failed: gave up after repeated errors; `error` says why
 */
export const inboundEmailStatusValues = [
  "received",
  "extracting",
  "extracted",
  "ignored",
  "failed",
] as const;
export type InboundEmailStatus = (typeof inboundEmailStatusValues)[number];

/** Postgres NOTIFY channel that tells the extraction job a new email has arrived. */
export const NOTIFY_CHANNEL = "inbound_email";

/** An email as the trip dashboard lists it. */
export type InboundEmail = {
  id: string;
  subject?: string;
  fromName?: string;
  fromAddress: string;
  /** ISO timestamp. */
  receivedAt: string;
  status: InboundEmailStatus;
};
