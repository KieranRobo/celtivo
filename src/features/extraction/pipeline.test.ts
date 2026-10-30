// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { AiExtract } from "./ai";
import { AiDeferred, extractBookings } from "./pipeline";

const encode = (text: string) => new TextEncoder().encode(text);

function eml({ subject, html }: { subject: string; html: string }) {
  return encode(
    [
      "From: Kieran <kieran@example.com>",
      `Subject: ${subject}`,
      "Date: Tue, 27 Oct 2026 09:12:00 +0000",
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
    ].join("\r\n"),
  );
}

const usage = { model: "claude-haiku-5-5", inputTokens: 900, outputTokens: 300 };
const flightItem = {
  kind: "flight",
  provider: "British Airways",
  reference: "ABC123",
  travellers: ["Kieran Robertson"],
  segments: [
    {
      airline: "British Airways",
      flightNumber: "BA730",
      departure: { airport: "LHR", localTime: "2027-02-06T07:15", timeZone: "Europe/London" },
      arrival: { airport: "GVA", localTime: "2027-02-06T09:55", timeZone: "Europe/Zurich" },
    },
  ],
};

describe("extractBookings", () => {
  it("skips emails no extractor recognises, without calling Claude", async () => {
    const ai = vi.fn<AiExtract>();
    const result = await extractBookings(
      eml({ subject: "Lunch?", html: "<p>Pizza on Friday?</p>" }),
      { ai },
    );
    expect(result).toEqual({ path: null, bookings: [] });
    expect(ai).not.toHaveBeenCalled();
  });

  it("asks Claude with the email as text, and keeps the bookings it validates", async () => {
    const ai = vi.fn<AiExtract>(async () => ({ items: [flightItem, { kind: "stay" }], usage }));
    const result = await extractBookings(
      eml({
        subject: "Fwd: Your flight booking",
        html: "<p>Flight <b>BA730</b> London Heathrow to Geneva</p><img src='x.png'>",
      }),
      { ai },
    );

    expect(result.path).toBe("ai");
    expect(result.usage).toEqual(usage);
    expect(result.bookings.map((booking) => booking.kind)).toEqual(["flight"]);
    const [email, extractors] = ai.mock.calls[0];
    expect(email.text).toBe("Flight BA730 London Heathrow to Geneva");
    expect(email.sentAt).toEqual(new Date("2026-10-27T09:12:00Z"));
    expect(extractors.map((extractor) => extractor.kind)).toEqual(["flight"]);
  });

  it("uses schema.org markup instead of Claude when it's there", async () => {
    const ai = vi.fn<AiExtract>();
    const markup = {
      "@type": "FlightReservation",
      reservationNumber: "XYZ789",
      reservationFor: {
        "@type": "Flight",
        flightNumber: "U28231",
        departureAirport: { iataCode: "LGW" },
        departureTime: "2027-02-06T07:00:00+00:00",
        arrivalAirport: { iataCode: "GVA" },
        arrivalTime: "2027-02-06T09:40:00+01:00",
      },
    };
    const result = await extractBookings(
      eml({
        subject: "Your easyJet booking",
        html: `<script type="application/ld+json">${JSON.stringify(markup)}</script><p>Flight</p>`,
      }),
      { ai },
    );
    expect(result.path).toBe("schema_org");
    expect(result.bookings).toHaveLength(1);
    expect(ai).not.toHaveBeenCalled();
  });

  it("defers instead of calling Claude when AI isn't allowed right now", async () => {
    const ai = vi.fn<AiExtract>();
    await expect(
      extractBookings(eml({ subject: "Your flight", html: "<p>Flight BA730</p>" }), {
        ai,
        allowAi: async () => false,
      }),
    ).rejects.toBeInstanceOf(AiDeferred);
    expect(ai).not.toHaveBeenCalled();
  });
});
