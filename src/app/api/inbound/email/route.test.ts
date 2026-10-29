// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { storeInboundEmail } from "@/features/inbound/repository";

import { POST } from "./route";

vi.mock("@/features/inbound/repository", () => ({ storeInboundEmail: vi.fn() }));

const notice = {
  key: "inbound/2026-10-29/abc.eml",
  to: "ski-trip-2027-7hd2kq9x@celtivo.space",
  from: "kieran@gmail.com",
  rawSize: 1234,
  headers: "Subject: Your booking\r\nMessage-ID: <1@example.com>\r\n",
};

function post(body: unknown, authorization = "Bearer test-secret") {
  return POST(
    new Request("http://localhost/api/inbound/email", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/inbound/email", () => {
  beforeEach(() => {
    vi.stubEnv("INBOUND_EMAIL_SECRET", "test-secret");
    vi.mocked(storeInboundEmail).mockReset().mockResolvedValue("stored");
  });

  it("stores the email under the token from the trip address", async () => {
    const response = await post(notice);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "stored" });
    expect(storeInboundEmail).toHaveBeenCalledWith(
      "7hd2kq9x",
      notice,
      expect.objectContaining({ subject: "Your booking", messageId: "<1@example.com>" }),
    );
  });

  it("reports duplicates so the Worker can drop its copy", async () => {
    vi.mocked(storeInboundEmail).mockResolvedValue("duplicate");
    expect(await (await post(notice)).json()).toEqual({ status: "duplicate" });
  });

  it("answers 404 for an address no trip has", async () => {
    vi.mocked(storeInboundEmail).mockResolvedValue("unknown-trip");
    expect((await post(notice)).status).toBe(404);
  });

  it("answers 404 for an address that isn't a trip address at all", async () => {
    expect((await post({ ...notice, to: "hello@celtivo.space" })).status).toBe(404);
    expect(storeInboundEmail).not.toHaveBeenCalled();
  });

  it("rejects a wrong or missing secret", async () => {
    expect((await post(notice, "Bearer nope")).status).toBe(401);
    expect((await post(notice, "")).status).toBe(401);
    expect(storeInboundEmail).not.toHaveBeenCalled();
  });

  it("rejects a malformed notice", async () => {
    expect((await post({ ...notice, rawSize: "big" })).status).toBe(400);
  });

  it("refuses everything when no secret is configured", async () => {
    vi.stubEnv("INBOUND_EMAIL_SECRET", "");
    expect((await post(notice)).status).toBe(503);
  });
});
