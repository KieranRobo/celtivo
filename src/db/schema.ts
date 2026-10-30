import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Relative imports: drizzle-kit loads this file outside Next and doesn't resolve "@/".
import {
  bookingKindValues,
  bookingStatusValues,
  extractionPathValues,
} from "../features/bookings/schema";
import { inboundEmailStatusValues } from "../features/inbound/schema";
import { groupSizeValues } from "../features/trips/schema";

// Columns are camelCase here and snake_case in Postgres (see `casing` in
// drizzle.config.ts and ./index.ts). After changing this file, run
// `pnpm db:generate` and commit the SQL it writes to drizzle/.

export const trips = pgTable("trips", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  destination: text(),
  roughDates: text(),
  // Plain text rather than a Postgres enum so the buckets can change freely.
  groupSize: text({ enum: groupSizeValues }).notNull(),
  // The secret in the trip's forwarding address (see features/inbound/address.ts).
  inboundToken: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// One row per email the Worker accepted for a trip. The raw message lives in R2 under
// `rawKey`; the header fields are read on arrival, the rest by the extraction job.
// The table doubles as the job's queue: `status` is the job state.
export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: uuid().primaryKey().defaultRandom(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    rawKey: text().notNull().unique(),
    rawSize: integer().notNull(),
    // SMTP envelope: who actually delivered it, and the trip address it was sent to.
    envelopeFrom: text().notNull(),
    envelopeTo: text().notNull(),
    headerFrom: text(),
    headerFromName: text(),
    subject: text(),
    messageId: text(),
    sentAt: timestamp({ withTimezone: true }),
    // SPF/DKIM/DMARC verdicts, kept for sender checks once members have accounts.
    authResults: text(),
    status: text({ enum: inboundEmailStatusValues }).notNull().default("received"),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    // Extraction job bookkeeping.
    attempts: integer().notNull().default(0),
    retryAt: timestamptz(),
    lockedUntil: timestamptz(),
    processedAt: timestamptz(),
    extractionPath: text({ enum: extractionPathValues }),
    model: text(),
    inputTokens: integer(),
    outputTokens: integer(),
    error: text(),
  },
  (table) => [
    // The same message delivered twice (e.g. a Worker retry) is stored once.
    unique().on(table.tripId, table.messageId),
    index().on(table.tripId, table.receivedAt),
    // What the job scans for work.
    index("inbound_emails_pending_index")
      .on(table.receivedAt)
      .where(sql`${table.status} in ('received', 'extracting')`),
  ],
);

// Every kind of booking shares this row; the kind's details live in its own table
// (flight_segments for flights). The board, review step and dedupe work across kinds.
export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    kind: text({ enum: bookingKindValues }).notNull(),
    status: text({ enum: bookingStatusValues }).notNull().default("pending_review"),
    // Who the booking is with: an airline, or the agency that sold it.
    provider: text(),
    // Booking reference / PNR, uppercased. Sensitive: never shown to the whole group.
    reference: text(),
    sourceEmailId: uuid().references(() => inboundEmails.id, { onDelete: "set null" }),
    extractionPath: text({ enum: extractionPathValues }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Three people forwarding the same confirmation make one booking. Bookings without a
    // reference can't be matched and are always added.
    unique().on(table.tripId, table.kind, table.reference),
    index().on(table.tripId),
  ],
);

// The people named on a booking, exactly as written ("ROBERTSON/KIERAN MR"). Matching
// them to trip members comes with the board (phase 3).
export const bookingTravellers = pgTable(
  "booking_travellers",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    nameAsWritten: text().notNull(),
  },
  (table) => [index().on(table.bookingId)],
);

// One row per leg of a flight booking. Times are kept as the airport's wall-clock time
// plus its zone, and as an instant for sorting the itinerary.
export const flightSegments = pgTable(
  "flight_segments",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    airline: text(),
    flightNumber: text().notNull(),
    departureAirport: text().notNull(),
    departureLocal: timestamp({ mode: "string" }).notNull(),
    departureTimeZone: text(),
    departureAt: timestamptz().notNull(),
    arrivalAirport: text().notNull(),
    arrivalLocal: timestamp({ mode: "string" }).notNull(),
    arrivalTimeZone: text(),
    arrivalAt: timestamptz().notNull(),
  },
  (table) => [index().on(table.bookingId)],
);

function timestamptz() {
  return timestamp({ withTimezone: true });
}
