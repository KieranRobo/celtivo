// The Email Worker's logic, free of Workers-only APIs so `pnpm inbound:send` can run the same
// steps locally (with a folder standing in for R2) and tests can run it with fakes.

/** What the app's POST /api/inbound/email expects. Mirrors inboundNoticeSchema in the app. */
export type InboundNotice = {
  /** Where the raw message is stored. */
  key: string;
  /** SMTP envelope recipient: the trip address. Header To: is the forwarder's own inbox. */
  to: string;
  /** SMTP envelope sender. */
  from: string;
  rawSize: number;
  /** The raw header block, which the app parses. */
  headers: string;
};

export type Outcome = "stored" | "duplicate" | "unknown-address" | "failed";

export type Envelope = { to: string; from: string };

export interface RawStore {
  put(key: string, raw: Uint8Array, envelope: Envelope): Promise<void>;
  delete(key: string): Promise<void>;
  /** Leaves a note for the sweep that the app hasn't acknowledged this key yet. */
  markUnacked(key: string): Promise<void>;
}

export interface SweepStore extends RawStore {
  listUnacked(): Promise<string[]>;
  clearUnacked(key: string): Promise<void>;
  /** The start of a stored message (enough for its headers), or null if it's gone. */
  readStart(
    key: string,
  ): Promise<{ envelope: Envelope; rawSize: number; start: Uint8Array } | null>;
}

export type AppConfig = { url: string; secret: string };

/** Headers longer than this are cut off; real ones are a few KB. */
export const HEADER_BLOCK_LIMIT = 64 * 1024;

export function newRawKey(now: Date): string {
  return `inbound/${now.toISOString().slice(0, 10)}/${crypto.randomUUID()}.eml`;
}

/** Everything before the first blank line, decoded as UTF-8. */
export function headerBlock(raw: Uint8Array): string {
  const end = Math.min(raw.length, HEADER_BLOCK_LIMIT);
  let cut = end;
  for (let i = 0; i < end - 1; i++) {
    if (raw[i] !== 10) continue;
    if (raw[i + 1] === 10 || (raw[i + 1] === 13 && raw[i + 2] === 10)) {
      cut = i + 1;
      break;
    }
  }
  return new TextDecoder().decode(raw.subarray(0, cut));
}

/**
 * Tells the app about a stored message, retrying network errors and 5xx after each delay.
 * 404 means the address isn't a trip's. Other 4xx are configuration or code bugs that a retry
 * won't fix, so they fail at once and wait for the sweep.
 */
export async function notifyApp(
  app: AppConfig,
  notice: InboundNotice,
  { delays = [1_000, 4_000], wait = sleep, fetchFn = fetch } = {},
): Promise<Outcome> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetchFn(`${app.url}/api/inbound/email`, {
        method: "POST",
        headers: { authorization: `Bearer ${app.secret}`, "content-type": "application/json" },
        body: JSON.stringify(notice),
      });
      if (response.status === 404) return "unknown-address";
      if (response.ok) {
        const body = (await response.json()) as { status?: string };
        return body.status === "duplicate" ? "duplicate" : "stored";
      }
      console.error(`App answered ${response.status} for ${notice.key}`);
      if (response.status < 500 && response.status !== 429) return "failed";
    } catch (error) {
      console.error(`Couldn't reach the app for ${notice.key}`, error);
    }
    if (attempt >= delays.length) return "failed";
    await wait(delays[attempt]);
  }
}

/**
 * Stores the raw message first, then tells the app. The message is never lost after the put:
 * if the app can't be reached, it waits in storage for the sweep.
 */
export async function receive(
  raw: Uint8Array,
  envelope: Envelope,
  store: RawStore,
  notify: (notice: InboundNotice) => Promise<Outcome>,
  key = newRawKey(new Date()),
): Promise<Outcome> {
  await store.put(key, raw, envelope);
  const outcome = await notify({
    key,
    ...envelope,
    rawSize: raw.length,
    headers: headerBlock(raw),
  });
  await settle(store, key, outcome);
  return outcome;
}

/** Retries every message the app hasn't acknowledged. Returns how many are still waiting. */
export async function sweep(
  store: SweepStore,
  notify: (notice: InboundNotice) => Promise<Outcome>,
): Promise<number> {
  let waiting = 0;
  for (const key of await store.listUnacked()) {
    const stored = await store.readStart(key);
    if (!stored) {
      // Expired or deleted: nothing left to deliver.
      await store.clearUnacked(key);
      continue;
    }
    const outcome = await notify({
      key,
      ...stored.envelope,
      rawSize: stored.rawSize,
      headers: headerBlock(stored.start),
    });
    if (outcome === "failed") {
      waiting++;
      continue;
    }
    await settle(store, key, outcome);
    await store.clearUnacked(key);
  }
  return waiting;
}

async function settle(store: RawStore, key: string, outcome: Outcome) {
  // Nothing to keep: no trip owns it, or the app already has this message under another key.
  if (outcome === "unknown-address" || outcome === "duplicate") await store.delete(key);
  if (outcome === "failed") await store.markUnacked(key);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
