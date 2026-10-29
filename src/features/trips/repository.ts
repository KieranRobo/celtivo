import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trips } from "@/db/schema";

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
  };
}

/**
 * Saves a trip under its name's slug plus a random suffix
 * ("ski-trip-2027-k3x9q"), rolling a new suffix if that one is taken.
 */
export async function insertTrip(input: CreateTripInput): Promise<Trip> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db
      .insert(trips)
      .values({ ...input, slug: tripSlug(input.name) })
      .onConflictDoNothing({ target: trips.slug })
      .returning();
    if (row) return toTrip(row);
  }
  throw new Error(`Couldn't find a free slug for "${input.name}"`);
}

export async function findTripBySlug(slug: string): Promise<Trip | null> {
  const row = await db.query.trips.findFirst({ where: eq(trips.slug, slug) });
  return row ? toTrip(row) : null;
}
