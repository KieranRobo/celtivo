import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboundEmails, trips } from "@/db/schema";

import type { EmailHeaders } from "./headers";
import type { InboundEmail, InboundNotice } from "./schema";

export type StoreOutcome = "stored" | "duplicate" | "unknown-trip";

/**
 * Records an email the Worker has put in storage. "duplicate" means this message is already
 * stored under a different key, so the caller can delete the new copy; a repeat of the same key
 * (a Worker retry after a lost response) counts as "stored".
 */
export async function storeInboundEmail(
  token: string,
  notice: InboundNotice,
  headers: EmailHeaders,
): Promise<StoreOutcome> {
  const trip = await db.query.trips.findFirst({
    columns: { id: true },
    where: eq(trips.inboundToken, token),
  });
  if (!trip) return "unknown-trip";

  const [row] = await db
    .insert(inboundEmails)
    .values({
      tripId: trip.id,
      rawKey: notice.key,
      rawSize: notice.rawSize,
      envelopeFrom: notice.from,
      envelopeTo: notice.to,
      headerFrom: headers.fromAddress,
      headerFromName: headers.fromName,
      subject: headers.subject,
      messageId: headers.messageId,
      sentAt: headers.sentAt,
      authResults: headers.authResults,
    })
    .onConflictDoNothing()
    .returning({ id: inboundEmails.id });
  if (row) return "stored";

  const sameKey = await db.query.inboundEmails.findFirst({
    columns: { id: true },
    where: eq(inboundEmails.rawKey, notice.key),
  });
  return sameKey ? "stored" : "duplicate";
}

/** The trip's emails, newest first. */
export async function listInboundEmails(tripId: string): Promise<InboundEmail[]> {
  const rows = await db.query.inboundEmails.findMany({
    columns: {
      id: true,
      subject: true,
      headerFrom: true,
      headerFromName: true,
      envelopeFrom: true,
      receivedAt: true,
    },
    where: eq(inboundEmails.tripId, tripId),
    orderBy: desc(inboundEmails.receivedAt),
    limit: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject ?? undefined,
    fromName: row.headerFromName ?? undefined,
    fromAddress: row.headerFrom ?? row.envelopeFrom,
    receivedAt: row.receivedAt.toISOString(),
  }));
}
