import { describe, expect, it } from "vitest";

import { parseHeaders } from "./headers";

const block = [
  "Received: by mx.cloudflare.net",
  "Authentication-Results: mx.cloudflare.net;",
  " dkim=pass header.d=gmail.com;",
  " spf=pass smtp.mailfrom=kieran@gmail.com",
  "From: =?UTF-8?B?S2llcmFuIFLDtmJlcnRzb24=?= <kieran@gmail.com>",
  "Subject: =?UTF-8?Q?Fwd:_Your_booking_=E2=80=93_Chalet_Marmotte?=",
  "Message-ID: <CAF123@mail.gmail.com>",
  "Date: Tue, 27 Oct 2026 09:12:00 +0000",
  "",
].join("\r\n");

describe("parseHeaders", () => {
  it("decodes the fields we keep", async () => {
    expect(await parseHeaders(block)).toEqual({
      subject: "Fwd: Your booking – Chalet Marmotte",
      messageId: "<CAF123@mail.gmail.com>",
      sentAt: new Date("2026-10-27T09:12:00Z"),
      fromAddress: "kieran@gmail.com",
      fromName: "Kieran Röbertson",
      authResults:
        "mx.cloudflare.net; dkim=pass header.d=gmail.com; spf=pass smtp.mailfrom=kieran@gmail.com",
    });
  });

  it("leaves out what isn't there", async () => {
    expect(await parseHeaders("From: someone@example.com\n")).toEqual({
      fromAddress: "someone@example.com",
    });
  });

  it("drops an unparseable date", async () => {
    const headers = await parseHeaders("Date: sometime soon\r\n");
    expect(headers.sentAt).toBeUndefined();
  });
});
