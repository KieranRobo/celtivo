// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  headerBlock,
  notifyApp,
  receive,
  sweep,
  type InboundNotice,
  type Outcome,
  type SweepStore,
} from "./inbound";

const encode = (text: string) => new TextEncoder().encode(text);
const raw = encode("From: a@example.com\r\nSubject: Hi\r\n\r\nBody text\r\n");
const envelope = { to: "ski-trip-7hd2kq9x@celtivo.space", from: "a@example.com" };
const app = { url: "https://celtivo.test", secret: "s3cret" };

function memoryStore() {
  const objects = new Map<string, { raw: Uint8Array; envelope: typeof envelope }>();
  const unacked = new Set<string>();
  const store: SweepStore = {
    put: async (key, raw, envelope) => void objects.set(key, { raw, envelope }),
    delete: async (key) => void objects.delete(key),
    markUnacked: async (key) => void unacked.add(key),
    listUnacked: async () => [...unacked],
    clearUnacked: async (key) => void unacked.delete(key),
    readStart: async (key) => {
      const object = objects.get(key);
      return object
        ? { envelope: object.envelope, rawSize: object.raw.length, start: object.raw }
        : null;
    },
  };
  return { store, objects, unacked };
}

describe("headerBlock", () => {
  it("stops at the first blank line", () => {
    expect(headerBlock(raw)).toBe("From: a@example.com\r\nSubject: Hi\r\n");
    expect(headerBlock(encode("Subject: Hi\n\nBody"))).toBe("Subject: Hi\n");
  });

  it("returns everything when there's no body", () => {
    expect(headerBlock(encode("Subject: Hi"))).toBe("Subject: Hi");
  });
});

describe("receive", () => {
  it("stores the message, then tells the app where it is", async () => {
    const { store, objects, unacked } = memoryStore();
    const notify = vi.fn(async (): Promise<Outcome> => "stored");

    expect(await receive(raw, envelope, store, notify, "inbound/k.eml")).toBe("stored");
    expect(objects.get("inbound/k.eml")?.raw).toBe(raw);
    expect(notify).toHaveBeenCalledWith({
      key: "inbound/k.eml",
      ...envelope,
      rawSize: raw.length,
      headers: "From: a@example.com\r\nSubject: Hi\r\n",
    });
    expect(unacked.size).toBe(0);
  });

  it.each(["unknown-address", "duplicate"] as const)(
    "deletes the copy when %s",
    async (outcome) => {
      const { store, objects } = memoryStore();
      await receive(raw, envelope, store, async () => outcome, "inbound/k.eml");
      expect(objects.has("inbound/k.eml")).toBe(false);
    },
  );

  it("keeps the message and marks it for the sweep when the app is down", async () => {
    const { store, objects, unacked } = memoryStore();
    await receive(raw, envelope, store, async () => "failed", "inbound/k.eml");
    expect(objects.has("inbound/k.eml")).toBe(true);
    expect([...unacked]).toEqual(["inbound/k.eml"]);
  });
});

describe("sweep", () => {
  it("delivers waiting messages and clears their markers", async () => {
    const { store, unacked } = memoryStore();
    await receive(raw, envelope, store, async () => "failed", "inbound/k.eml");

    const notify = vi.fn<(notice: InboundNotice) => Promise<Outcome>>(async () => "stored");
    expect(await sweep(store, notify)).toBe(0);
    expect(notify.mock.calls[0][0]).toMatchObject({ key: "inbound/k.eml", ...envelope });
    expect(unacked.size).toBe(0);
  });

  it("keeps markers while the app is still down", async () => {
    const { store, unacked } = memoryStore();
    await receive(raw, envelope, store, async () => "failed", "inbound/k.eml");
    expect(await sweep(store, async () => "failed")).toBe(1);
    expect(unacked.size).toBe(1);
  });

  it("drops markers whose message has expired", async () => {
    const { store, objects, unacked } = memoryStore();
    await receive(raw, envelope, store, async () => "failed", "inbound/k.eml");
    objects.clear();
    const notify = vi.fn();
    await sweep(store, notify);
    expect(notify).not.toHaveBeenCalled();
    expect(unacked.size).toBe(0);
  });
});

describe("notifyApp", () => {
  const notice: InboundNotice = { key: "k", ...envelope, rawSize: 1, headers: "" };
  const reply = (status: number, body: unknown = {}) => Response.json(body, { status });
  const options = (fetchFn: typeof fetch) => ({ fetchFn, wait: async () => {} });

  it("posts the notice with the shared secret", async () => {
    const fetchFn = vi.fn(async () => reply(200, { status: "stored" }));
    expect(await notifyApp(app, notice, options(fetchFn))).toBe("stored");
    expect(fetchFn).toHaveBeenCalledWith("https://celtivo.test/api/inbound/email", {
      method: "POST",
      headers: { authorization: "Bearer s3cret", "content-type": "application/json" },
      body: JSON.stringify(notice),
    });
  });

  it("maps the app's answers", async () => {
    const answer = (response: Response) =>
      notifyApp(
        app,
        notice,
        options(async () => response),
      );
    expect(await answer(reply(200, { status: "duplicate" }))).toBe("duplicate");
    expect(await answer(reply(404))).toBe("unknown-address");
  });

  it("retries server errors and network failures, then gives up", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(reply(502))
      .mockResolvedValueOnce(reply(200, { status: "stored" }));
    expect(await notifyApp(app, notice, options(fetchFn))).toBe("stored");

    const down = vi.fn(async () => reply(503));
    expect(await notifyApp(app, notice, options(down))).toBe("failed");
    expect(down).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry errors a retry can't fix", async () => {
    const fetchFn = vi.fn(async () => reply(401));
    expect(await notifyApp(app, notice, options(fetchFn))).toBe("failed");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
