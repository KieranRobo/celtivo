// Runs once when a server instance starts, before it takes requests.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local for local dev.");
  }
  const { runMigrations } = await import("./db/migrate");
  await runMigrations();

  // Reads forwarded emails into bookings in the background (features/extraction/job.ts).
  if (process.env.EXTRACTION_JOB !== "off") {
    const { startExtractionJob } = await import("./features/extraction/job");
    startExtractionJob();
  }
}
