import { describe, expect, it } from "vitest";

import { findSchemaOrgNodes } from "../schema-org";
import { flightExtractor } from "./flight";

const email = { subject: "", from: "", text: "", schemaOrg: [] };

const aiOutput = {
  kind: "flight",
  provider: "British Airways",
  reference: "abc 123",
  travellers: ["ROBERTSON/KIERAN MR", " ROBERTSON/KIERAN MR "],
  segments: [
    {
      airline: null,
      flightNumber: "BA 731",
      departure: { airport: "gva", localTime: "2027-02-13T19:40", timeZone: "Europe/Zurich" },
      arrival: { airport: "LHR", localTime: "2027-02-13T20:25", timeZone: "Europe/London" },
    },
    {
      airline: "British Airways",
      flightNumber: "BA730",
      departure: { airport: "LHR", localTime: "2027-02-06T07:15:00", timeZone: "Europe/London" },
      arrival: { airport: "GVA", localTime: "2027-02-06T09:55", timeZone: "Europe/Zurich" },
    },
  ],
};

describe("flightExtractor.fromAi", () => {
  it("normalises a booking and puts its legs in travel order", () => {
    expect(flightExtractor.fromAi(aiOutput, email)?.booking).toEqual({
      provider: "British Airways",
      reference: "ABC123",
      travellers: ["ROBERTSON/KIERAN MR"],
      segments: [
        {
          airline: "British Airways",
          flightNumber: "BA730",
          departure: {
            airport: "LHR",
            localTime: "2027-02-06T07:15",
            timeZone: "Europe/London",
            at: "2027-02-06T07:15:00.000Z",
          },
          arrival: {
            airport: "GVA",
            localTime: "2027-02-06T09:55",
            timeZone: "Europe/Zurich",
            at: "2027-02-06T08:55:00.000Z",
          },
        },
        {
          airline: undefined,
          flightNumber: "BA731",
          departure: {
            airport: "GVA",
            localTime: "2027-02-13T19:40",
            timeZone: "Europe/Zurich",
            at: "2027-02-13T18:40:00.000Z",
          },
          arrival: {
            airport: "LHR",
            localTime: "2027-02-13T20:25",
            timeZone: "Europe/London",
            at: "2027-02-13T20:25:00.000Z",
          },
        },
      ],
    });
  });

  it("drops legs it can't trust, and the booking when none are left", () => {
    const [good, other] = aiOutput.segments;
    const bad = [
      { ...good, departure: { ...good.departure, airport: "Geneva" } },
      { ...good, departure: { ...good.departure, timeZone: "CET+1" } },
      { ...good, arrival: { ...good.arrival, localTime: "2027-02-13T18:00" } },
      { ...good, flightNumber: "see attached" },
    ];
    const kept = flightExtractor.fromAi({ ...aiOutput, segments: [...bad, other] }, email);
    expect((kept?.booking as { segments: unknown[] }).segments).toHaveLength(1);
    expect(flightExtractor.fromAi({ ...aiOutput, segments: bad }, email)).toBeNull();
  });

  it("ignores output for another kind", () => {
    expect(flightExtractor.fromAi({ kind: "stay" }, email)).toBeNull();
  });
});

describe("flightExtractor.fromSchemaOrg", () => {
  const reservation = (
    passenger: string,
    number: string,
    from: string,
    to: string,
    departs: string,
    arrives: string,
  ) => ({
    "@context": "http://schema.org",
    "@type": "FlightReservation",
    reservationNumber: "XYZ789",
    underName: { "@type": "Person", name: passenger },
    reservationFor: {
      "@type": "Flight",
      flightNumber: number,
      airline: { "@type": "Airline", name: "easyJet", iataCode: "U2" },
      departureAirport: { "@type": "Airport", iataCode: from },
      departureTime: departs,
      arrivalAirport: { "@type": "Airport", iataCode: to },
      arrivalTime: arrives,
    },
  });
  const html = (nodes: unknown[]) =>
    `<html><head><script type="application/ld+json">${JSON.stringify(nodes)}</script></head></html>`;

  it("groups reservations into one booking per reference", () => {
    const nodes = findSchemaOrgNodes(
      html([
        reservation(
          "Kieran",
          "8231",
          "LGW",
          "GVA",
          "2027-02-06T07:00:00+00:00",
          "2027-02-06T09:40:00+01:00",
        ),
        reservation(
          "Alex",
          "8231",
          "LGW",
          "GVA",
          "2027-02-06T07:00:00+00:00",
          "2027-02-06T09:40:00+01:00",
        ),
      ]),
    );
    const bookings = flightExtractor.fromSchemaOrg(nodes);

    expect(bookings).toHaveLength(1);
    expect(bookings[0].booking).toMatchObject({
      provider: "easyJet",
      reference: "XYZ789",
      travellers: ["Kieran", "Alex"],
      segments: [
        {
          flightNumber: "U28231",
          departure: { airport: "LGW", localTime: "2027-02-06T07:00", timeZone: null },
          arrival: {
            airport: "GVA",
            localTime: "2027-02-06T09:40",
            at: "2027-02-06T08:40:00.000Z",
          },
        },
      ],
    });
  });

  it("leaves markup without offsets to the AI path", () => {
    const nodes = findSchemaOrgNodes(
      html([
        reservation("Kieran", "8231", "LGW", "GVA", "2027-02-06T07:00:00", "2027-02-06T09:40:00"),
      ]),
    );
    expect(flightExtractor.fromSchemaOrg(nodes)).toEqual([]);
  });
});

describe("flightExtractor.mightContain", () => {
  it("looks for flight words in the subject and body", () => {
    expect(flightExtractor.mightContain({ ...email, subject: "Your e-ticket receipt" })).toBe(true);
    expect(flightExtractor.mightContain({ ...email, text: "Boarding starts at 06:30" })).toBe(true);
    expect(flightExtractor.mightContain({ ...email, subject: "Lunch on Friday?" })).toBe(false);
  });
});
