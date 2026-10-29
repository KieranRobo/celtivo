import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Relative imports: drizzle-kit loads this file outside Next and doesn't resolve "@/".
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
// `rawKey`; everything else here is read from its headers.
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
    // SPF/DKIM/DMARC verdicts, kept for the sender checks in phase 2b.
    authResults: text(),
    status: text({ enum: inboundEmailStatusValues }).notNull().default("received"),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The same message delivered twice (e.g. a Worker retry) is stored once.
    unique().on(table.tripId, table.messageId),
    index().on(table.tripId, table.receivedAt),
  ],
);
