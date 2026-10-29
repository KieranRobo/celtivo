import { db } from "@/db";
import { trips } from "@/db/schema";

import type { CreateTripInput, Trip } from "./schema";
import { slugify } from "./slug";

/**
 * Saves a trip under the slug of its name, or — when another trip already has
 * that slug — the slug plus a short random suffix ("ski-trip-2027-3f9a1c").
 */
export async function insertTrip(input: CreateTripInput): Promise<Trip> {
  const base = slugify(input.name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const [row] = await db
      .insert(trips)
      .values({ ...input, slug })
      .onConflictDoNothing({ target: trips.slug })
      .returning();
    if (row) {
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        destination: row.destination ?? undefined,
        roughDates: row.roughDates ?? undefined,
        groupSize: row.groupSize,
        inviteUrl: `https://celtivo.com/join/${row.slug}`,
      };
    }
  }
  throw new Error(`Couldn't find a free slug for "${base}"`);
}
