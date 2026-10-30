import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { bookings, bookingTravellers, flightSegments } from "@/db/schema";
import type { SaveContext, Transaction } from "@/features/extraction/types";

import type { BookingKind, TripBooking } from "./schema";

export type NewBooking = {
  kind: BookingKind;
  provider?: string;
  reference?: string;
  travellers: string[];
};

/**
 * Saves the part of a booking every kind shares, returning its id, or null when the trip
 * already has a booking of this kind with the same reference. The caller saves the kind's
 * details in the same transaction.
 */
export async function insertBooking(
  tx: Transaction,
  context: SaveContext,
  booking: NewBooking,
): Promise<string | null> {
  const [row] = await tx
    .insert(bookings)
    .values({
      tripId: context.tripId,
      kind: booking.kind,
      provider: booking.provider,
      reference: booking.reference,
      sourceEmailId: context.emailId,
      extractionPath: context.path,
    })
    .onConflictDoNothing()
    .returning({ id: bookings.id });
  if (!row) return null;

  if (booking.travellers.length > 0) {
    await tx.insert(bookingTravellers).values(
      booking.travellers.map((nameAsWritten, position) => ({
        bookingId: row.id,
        position,
        nameAsWritten,
      })),
    );
  }
  return row.id;
}

/** The trip's bookings, ordered by when they start. */
export async function listTripBookings(tripId: string): Promise<TripBooking[]> {
  const rows = await db.query.bookings.findMany({
    columns: { id: true, kind: true, status: true, provider: true },
    where: eq(bookings.tripId, tripId),
  });
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [travellers, segments] = await Promise.all([
    db
      .select()
      .from(bookingTravellers)
      .where(inArray(bookingTravellers.bookingId, ids))
      .orderBy(asc(bookingTravellers.position)),
    db
      .select()
      .from(flightSegments)
      .where(inArray(flightSegments.bookingId, ids))
      .orderBy(asc(flightSegments.position)),
  ]);

  return rows
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      provider: row.provider ?? undefined,
      travellers: travellers
        .filter((traveller) => traveller.bookingId === row.id)
        .map((traveller) => traveller.nameAsWritten),
      segments: segments
        .filter((segment) => segment.bookingId === row.id)
        .map((segment) => ({
          airline: segment.airline ?? undefined,
          flightNumber: segment.flightNumber,
          departure: {
            airport: segment.departureAirport,
            localTime: segment.departureLocal.slice(0, 16).replace(" ", "T"),
            timeZone: segment.departureTimeZone,
            at: segment.departureAt.toISOString(),
          },
          arrival: {
            airport: segment.arrivalAirport,
            localTime: segment.arrivalLocal.slice(0, 16).replace(" ", "T"),
            timeZone: segment.arrivalTimeZone,
            at: segment.arrivalAt.toISOString(),
          },
        })),
    }))
    .sort((a, b) => firstDeparture(a).localeCompare(firstDeparture(b)));
}

function firstDeparture(booking: TripBooking): string {
  return booking.segments[0]?.departure.at ?? "";
}
