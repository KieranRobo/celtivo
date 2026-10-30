import Anthropic from "@anthropic-ai/sdk";
import { and, count, eq, gt, sql } from "drizzle-orm";
import type { PoolClient } from "pg";

import { db, pool } from "@/db";
import { inboundEmails } from "@/db/schema";
import { NOTIFY_CHANNEL } from "@/features/inbound/schema";
import {
  isR2Configured,
  rawEmailStore,
  RawEmailMissing,
  type RawEmailStore,
} from "@/features/inbound/storage";

import { claudeExtractor, PermanentExtractionError, type AiExtract } from "./ai";
import { AiDeferred, extractBookings } from "./pipeline";

// The extraction job runs inside the app server (started from src/instrumentation.ts). The
// inbound_emails table is its queue: POST /api/inbound/email inserts a "received" row and
// sends NOTIFY_CHANNEL, which wakes the job at once; a poll every minute catches anything
// missed while the server was down, and picks up retries when they're due.

const POLL_MS = 60_000;
const LOCK_MINUTES = 5;
/** Minutes to wait before each retry; one more failure after the last marks it failed. */
const RETRY_DELAYS_MINUTES = [1, 5, 30];
const DEFAULT_DAILY_AI_CAP = 50;

type Claimed = { id: string; trip_id: string; raw_key: string; attempts: number };

export type JobOptions = { store?: RawEmailStore; ai?: AiExtract; pollMs?: number };

/** Starts the job unless it's missing configuration. Returns a function that stops it. */
export function startExtractionJob(options: JobOptions = {}): () => void {
  if (!process.env.ANTHROPIC_API_KEY && !options.ai) {
    console.warn("Extraction job not started: ANTHROPIC_API_KEY is not set.");
    return () => {};
  }
  if (process.env.NODE_ENV === "production" && !isR2Configured() && !options.store) {
    console.warn(
      "Extraction job not started: R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not set.",
    );
    return () => {};
  }

  const store = options.store ?? rawEmailStore();
  const ai = options.ai ?? claudeExtractor();
  let stopped = false;
  let running = false;
  let again = false;
  let listener: PoolClient | undefined;

  async function drain() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        let claimed: Claimed | undefined;
        while (!stopped && (claimed = await claimNext())) await processEmail(claimed, store, ai);
      } while (again && !stopped);
    } catch (error) {
      console.error("Extraction job error", error);
    } finally {
      running = false;
    }
  }

  async function listen() {
    try {
      listener = await pool.connect();
      listener.on("notification", () => void drain());
      listener.on("error", (error) => {
        console.error("Extraction job lost its LISTEN connection", error);
        listener?.release(true);
        listener = undefined;
        if (!stopped) setTimeout(listen, 5_000);
      });
      await listener.query(`listen ${NOTIFY_CHANNEL}`);
    } catch (error) {
      console.error("Extraction job couldn't LISTEN; relying on polling", error);
      listener?.release(true);
      listener = undefined;
      if (!stopped) setTimeout(listen, POLL_MS);
    }
  }

  const poll = setInterval(() => void drain(), options.pollMs ?? POLL_MS);
  poll.unref();
  void listen();
  void drain();
  console.info(`Extraction job started (model ${process.env.EXTRACTION_MODEL || "default"}).`);

  return () => {
    stopped = true;
    clearInterval(poll);
    listener?.release(true);
  };
}

/**
 * Takes the oldest email that's due, or one whose previous run died mid-way (its lock
 * expired). SKIP LOCKED lets several server instances share the queue safely.
 */
async function claimNext(): Promise<Claimed | undefined> {
  const result = await db.execute<Claimed>(sql`
    update inbound_emails
    set status = 'extracting',
        attempts = attempts + 1,
        locked_until = now() + make_interval(mins => ${LOCK_MINUTES})
    where id = (
      select id from inbound_emails
      where (status = 'received' and (retry_at is null or retry_at <= now()))
         or (status = 'extracting' and locked_until < now())
      order by received_at
      for update skip locked
      limit 1
    )
    returning id, trip_id, raw_key, attempts`);
  return result.rows[0];
}

async function processEmail(email: Claimed, store: RawEmailStore, ai: AiExtract) {
  try {
    const raw = await store.read(email.raw_key);
    const result = await extractBookings(raw, { ai, allowAi: () => underDailyCap(email.trip_id) });

    const outcomes = await db.transaction(async (tx) => {
      const context = { tripId: email.trip_id, emailId: email.id, path: result.path ?? "ai" };
      const saved = [];
      for (const booking of result.bookings) saved.push(await booking.save(tx, context));
      await tx
        .update(inboundEmails)
        .set({
          status: result.bookings.length > 0 ? "extracted" : "ignored",
          processedAt: new Date(),
          lockedUntil: null,
          retryAt: null,
          error: null,
          extractionPath: result.path,
          model: result.usage?.model,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        })
        .where(eq(inboundEmails.id, email.id));
      return saved;
    });

    const usage = result.usage
      ? ` (${result.usage.model}, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out)`
      : "";
    console.info(
      `Email ${email.id}: ${outcomes.length === 0 ? "no bookings" : outcomes.join(", ")} via ${result.path ?? "pre-filter"}${usage}`,
    );
  } catch (error) {
    await recordFailure(email, error);
  }
}

async function recordFailure(email: Claimed, error: unknown) {
  if (error instanceof AiDeferred) {
    // Not the email's fault: try again in an hour without spending an attempt.
    await reschedule(email.id, 60, sql`${inboundEmails.attempts} - 1`, null);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  const permanent =
    error instanceof PermanentExtractionError ||
    error instanceof RawEmailMissing ||
    error instanceof Anthropic.BadRequestError;
  const delay = RETRY_DELAYS_MINUTES[email.attempts - 1];

  if (permanent || delay === undefined) {
    console.error(`Email ${email.id} failed after ${email.attempts} attempt(s): ${message}`);
    await db
      .update(inboundEmails)
      .set({ status: "failed", error: message, processedAt: new Date(), lockedUntil: null })
      .where(eq(inboundEmails.id, email.id));
  } else {
    console.warn(
      `Email ${email.id} attempt ${email.attempts} failed, retrying in ${delay} min: ${message}`,
    );
    await reschedule(email.id, delay, sql`${inboundEmails.attempts}`, message);
  }
}

async function reschedule(
  id: string,
  minutes: number,
  attempts: ReturnType<typeof sql>,
  error: string | null,
) {
  await db
    .update(inboundEmails)
    .set({
      status: "received",
      attempts,
      error,
      lockedUntil: null,
      retryAt: sql`now() + make_interval(mins => ${minutes})`,
    })
    .where(eq(inboundEmails.id, id));
}

/** At most EXTRACTION_DAILY_AI_CAP Claude extractions per trip in any 24 hours. */
async function underDailyCap(tripId: string): Promise<boolean> {
  const cap = Number(process.env.EXTRACTION_DAILY_AI_CAP) || DEFAULT_DAILY_AI_CAP;
  const [{ used }] = await db
    .select({ used: count() })
    .from(inboundEmails)
    .where(
      and(
        eq(inboundEmails.tripId, tripId),
        eq(inboundEmails.extractionPath, "ai"),
        gt(inboundEmails.processedAt, sql`now() - interval '1 day'`),
      ),
    );
  return used < cap;
}
