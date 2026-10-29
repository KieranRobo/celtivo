import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trips } from "@/db/schema";

import { inboundAddress, inboundToken } from "../inbound/address";
import type { CreateTripInput, Trip } from "./schema";
import { tripSlug } from "./slug";

function toTrip(row: typeof trips.$inferSelect): Trip {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    destination: row.destination ?? undefined,
    roughDates: row.roughDates ?? undefined,
    groupSize: row.groupSize,
    createdAt: row.createdAt.toISOString(),
    url: `https://celtivo.com/trip/${row.slug}`,
    inviteUrl: `https://celtivo.com/join/${row.slug}`,
    inboundAddress: inboundAddress(row.name, row.inboundToken),
  };
}

/**
 * Saves a trip under its name's slug plus a random suffix
 * ("ski-trip-2027-k3x9q"), rolling a new suffix (and inbound token) if either is taken.
 */
export async function insertTrip(input: CreateTripInput): Promise<Trip> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(trips)
      .values({ ...input, slug: tripSlug(input.name), inboundToken: inboundToken() })
      .onConflictDoNothing()
      .returning();
    if (row) return toTrip(row);
  }
  throw new Error(`Couldn't find a free slug for "${input.name}"`);
}

export async function findTripBySlug(slug: string): Promise<Trip | null> {
  const row = await db.query.trips.findFirst({ where: eq(trips.slug, slug) });
  return row ? toTrip(row) : null;
}
