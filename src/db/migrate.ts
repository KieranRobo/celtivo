import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { pool } from ".";

// Any fixed number works; it just has to be the same for every instance.
const MIGRATION_LOCK = 4_242_001;

/**
 * Applies pending SQL migrations from drizzle/. Called once at server start
 * (src/instrumentation.ts). The advisory lock makes concurrent instances wait
 * their turn, so only the first one does any work during a rolling deploy.
 */
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK]);
    await migrate(drizzle({ client }), {
      // process.cwd() is the project root in dev and /app in the Docker image.
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
  } finally {
    // Releasing with `true` closes the connection, which drops the lock even
    // if migrate threw mid-transaction.
    client.release(true);
  }
}
