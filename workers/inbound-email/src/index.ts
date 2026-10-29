// Cloudflare Email Worker for trip mail. The catch-all rule on celtivo.space sends every
// message here; it is stored in R2 and handed to the app. See docs/product/email-ingestion.md.

import {
  HEADER_BLOCK_LIMIT,
  notifyApp,
  receive,
  sweep,
  type AppConfig,
  type SweepStore,
} from "./inbound";

interface Env {
  INBOUND: R2Bucket;
  /** The app's origin, e.g. https://celtivo.com. */
  APP_URL: string;
  /** Shared with the app; set with `wrangler secret put INBOUND_EMAIL_SECRET`. */
  INBOUND_EMAIL_SECRET: string;
}

const UNACKED_PREFIX = "unacked/";

function r2Store(bucket: R2Bucket): SweepStore {
  return {
    async put(key, raw, envelope) {
      await bucket.put(key, raw, {
        httpMetadata: { contentType: "message/rfc822" },
        customMetadata: envelope,
      });
    },
    async delete(key) {
      await bucket.delete(key);
    },
    async markUnacked(key) {
      // An empty marker object; the lifecycle rule expires these along with the messages.
      await bucket.put(UNACKED_PREFIX + key, "");
    },
    async listUnacked() {
      const listing = await bucket.list({ prefix: UNACKED_PREFIX, limit: 100 });
      return listing.objects.map((object) => object.key.slice(UNACKED_PREFIX.length));
    },
    async clearUnacked(key) {
      await bucket.delete(UNACKED_PREFIX + key);
    },
    async readStart(key) {
      const object = await bucket.get(key, { range: { offset: 0, length: HEADER_BLOCK_LIMIT } });
      if (!object) return null;
      const { to = "", from = "" } = object.customMetadata ?? {};
      return {
        envelope: { to, from },
        rawSize: object.size,
        start: new Uint8Array(await object.arrayBuffer()),
      };
    },
  };
}

function app(env: Env): AppConfig {
  return { url: env.APP_URL, secret: env.INBOUND_EMAIL_SECRET };
}

export default {
  async email(message, env) {
    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    // If the R2 put itself throws, the error propagates: that's the one case where the
    // message isn't safe, and Cloudflare's handling of it is out of our hands.
    const outcome = await receive(
      raw,
      { to: message.to, from: message.from },
      r2Store(env.INBOUND),
      (notice) => notifyApp(app(env), notice),
    );
    if (outcome === "unknown-address") message.setReject("No Celtivo trip has this address");
    // "failed" is accepted, not bounced: the message is in R2 and the sweep retries it.
  },

  async scheduled(_controller, env) {
    const waiting = await sweep(r2Store(env.INBOUND), (notice) =>
      notifyApp(app(env), notice, { delays: [] }),
    );
    if (waiting > 0) console.warn(`${waiting} inbound emails still unacknowledged by the app`);
  },
} satisfies ExportedHandler<Env>;
