import { createHash, timingSafeEqual } from "node:crypto";

import { tokenFromAddress } from "@/features/inbound/address";
import { parseHeaders } from "@/features/inbound/headers";
import { storeInboundEmail } from "@/features/inbound/repository";
import { inboundNoticeSchema } from "@/features/inbound/schema";

/**
 * Called by the Email Worker after it has saved a raw message to R2. Answers 404 for an
 * address that isn't a trip's, so the Worker can bounce it; any other non-2xx makes the
 * Worker retry later.
 */
export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    console.error("INBOUND_EMAIL_SECRET is not set; refusing inbound email.");
    return Response.json({ error: "not-configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = inboundNoticeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid-notice" }, { status: 400 });
  const notice = parsed.data;

  const token = tokenFromAddress(notice.to);
  if (!token) return Response.json({ error: "unknown-address" }, { status: 404 });

  const outcome = await storeInboundEmail(token, notice, await parseHeaders(notice.headers));
  if (outcome === "unknown-trip") {
    return Response.json({ error: "unknown-address" }, { status: 404 });
  }
  return Response.json({ status: outcome });
}

function isAuthorized(header: string | null, secret: string): boolean {
  // Hash both sides so timingSafeEqual gets equal-length input whatever was sent.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}
