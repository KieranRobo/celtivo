import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Relative import: drizzle-kit loads this file outside Next and doesn't resolve "@/".
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
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
