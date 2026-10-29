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

/** Only "received" exists so far; extraction (phase 2b) adds the states after it. */
export const inboundEmailStatusValues = ["received"] as const;

/** An email as the trip dashboard lists it. */
export type InboundEmail = {
  id: string;
  subject?: string;
  fromName?: string;
  fromAddress: string;
  /** ISO timestamp. */
  receivedAt: string;
};
