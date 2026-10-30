import { z } from "zod";

import { flightSegments } from "@/db/schema";
import { insertBooking } from "@/features/bookings/repository";
import type { FlightEndpoint, FlightSegment } from "@/features/bookings/schema";

import { child, hasType, text, type SchemaOrgNode } from "../schema-org";
import { isTimeZone, normalizeLocalTime, splitOffsetTime, zonedTimeToInstant } from "../time";
import type { ExtractedBooking, Extractor } from "../types";

export type FlightBooking = {
  provider?: string;
  reference?: string;
  travellers: string[];
  segments: FlightSegment[];
};

const FLIGHT_WORDS =
  /\b(flights?|airlines?|airways|boarding|e-?tickets?|itinerary|departures?|arrivals?|check-?in|pnr)\b/i;

const endpointSchema = z.object({
  airport: z.string().describe("IATA airport code, e.g. LHR"),
  localTime: z
    .string()
    .describe("Local date and time at this airport, ISO 8601 without an offset: 2027-02-06T07:15"),
  timeZone: z.string().describe("IANA time zone of this airport, e.g. Europe/London"),
});

const aiSchema = z.object({
  kind: z.literal("flight"),
  provider: z
    .string()
    .nullable()
    .describe("The airline or travel agency the booking was made with"),
  reference: z.string().nullable().describe("Booking reference / PNR, e.g. ABC123"),
  travellers: z.array(z.string()).describe("Passenger names exactly as written"),
  segments: z
    .array(
      z.object({
        airline: z.string().nullable().describe("Airline operating this flight"),
        flightNumber: z.string().describe("Carrier code and number, e.g. BA342"),
        departure: endpointSchema,
        arrival: endpointSchema,
      }),
    )
    .describe("Every flight in the booking, in travel order, including connections and returns"),
});

export const flightExtractor: Extractor = {
  kind: "flight",
  aiSchema,
  aiInstructions: [
    "flight: one booking per booking reference. List every flight leg, outbound and return,",
    "including connections. Times are local to each airport, exactly as printed; never",
    "convert them. Use the email's sent date to settle the year when one is missing. If the",
    "email only mentions a flight without confirming a booking (an offer, a newsletter, a",
    "price alert), don't extract it.",
  ].join(" "),

  mightContain(email) {
    return FLIGHT_WORDS.test(email.subject) || FLIGHT_WORDS.test(email.text);
  },

  fromSchemaOrg(nodes) {
    const byReference = new Map<string, SchemaOrgNode[]>();
    for (const node of nodes.filter((node) => hasType(node, "FlightReservation"))) {
      const reference = text(node, "reservationNumber") ?? "";
      byReference.set(reference, [...(byReference.get(reference) ?? []), node]);
    }

    const extracted: ExtractedBooking[] = [];
    for (const [reference, reservations] of byReference) {
      const segments = reservations.map((reservation) => schemaOrgSegment(reservation));
      // Without explicit offsets the times are ambiguous: let Claude read the email instead.
      if (segments.some((segment) => !segment)) return [];
      const airline = child(child(reservations[0], "reservationFor"), "airline");
      const booking = normalize({
        provider: text(child(reservations[0], "provider"), "name") ?? text(airline, "name"),
        reference,
        travellers: reservations.flatMap((reservation) => {
          const name = text(child(reservation, "underName"), "name");
          return name ? [name] : [];
        }),
        segments: segments as FlightSegment[],
      });
      if (booking) extracted.push(prepared(booking));
    }
    return extracted;
  },

  fromAi(output) {
    const parsed = aiSchema.safeParse(output);
    if (!parsed.success) return null;
    const draft = parsed.data;

    const segments = draft.segments.flatMap((segment) => {
      const departure = aiEndpoint(segment.departure);
      const arrival = aiEndpoint(segment.arrival);
      return departure && arrival
        ? [
            {
              airline: segment.airline ?? undefined,
              flightNumber: segment.flightNumber,
              departure,
              arrival,
            },
          ]
        : [];
    });
    const booking = normalize({
      provider: draft.provider ?? undefined,
      reference: draft.reference ?? undefined,
      travellers: draft.travellers,
      segments,
    });
    return booking && prepared(booking);
  },
};

/**
 * Tidies a booking and checks it's usable: IATA codes, flight numbers, and arrivals after
 * departures. Segments that fail are dropped; a booking with none left is null.
 */
export function normalize(booking: FlightBooking): FlightBooking | null {
  const seen = new Set<string>();
  const segments = booking.segments.flatMap((segment) => {
    const flightNumber = segment.flightNumber.replace(/\s+/g, "").toUpperCase();
    const departure = { ...segment.departure, airport: segment.departure.airport.toUpperCase() };
    const arrival = { ...segment.arrival, airport: segment.arrival.airport.toUpperCase() };
    const key = `${flightNumber}|${departure.at}`;
    const valid =
      /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber) &&
      /^[A-Z]{3}$/.test(departure.airport) &&
      /^[A-Z]{3}$/.test(arrival.airport) &&
      arrival.at > departure.at &&
      !seen.has(key);
    seen.add(key);
    return valid ? [{ ...segment, flightNumber, departure, arrival }] : [];
  });
  if (segments.length === 0) return null;

  segments.sort((a, b) => a.departure.at.localeCompare(b.departure.at));
  return {
    provider: booking.provider?.trim() || undefined,
    reference: booking.reference?.replace(/\s+/g, "").toUpperCase() || undefined,
    travellers: [...new Set(booking.travellers.map((name) => name.trim()).filter(Boolean))],
    segments,
  };
}

function aiEndpoint(endpoint: z.infer<typeof endpointSchema>): FlightEndpoint | null {
  const localTime = normalizeLocalTime(endpoint.localTime);
  if (!localTime || !isTimeZone(endpoint.timeZone)) return null;
  return {
    airport: endpoint.airport.trim(),
    localTime,
    timeZone: endpoint.timeZone,
    at: zonedTimeToInstant(localTime, endpoint.timeZone).toISOString(),
  };
}

function schemaOrgSegment(reservation: SchemaOrgNode): FlightSegment | null {
  const flight = child(reservation, "reservationFor");
  const airline = child(flight, "airline");
  const departure = schemaOrgEndpoint(flight, "departure");
  const arrival = schemaOrgEndpoint(flight, "arrival");
  const number = text(flight, "flightNumber");
  if (!departure || !arrival || !number) return null;
  // flightNumber is often just the digits, with the carrier in airline.iataCode.
  const carrier = text(airline, "iataCode") ?? "";
  return {
    airline: text(airline, "name"),
    flightNumber: /^\d/.test(number) ? `${carrier}${number}` : number,
    departure,
    arrival,
  };
}

function schemaOrgEndpoint(
  flight: SchemaOrgNode | undefined,
  side: "departure" | "arrival",
): FlightEndpoint | null {
  const airport = text(child(flight, `${side}Airport`), "iataCode");
  const time = splitOffsetTime(text(flight, `${side}Time`) ?? "");
  if (!airport || !time) return null;
  return { airport, localTime: time.localTime, timeZone: null, at: time.at.toISOString() };
}

function prepared(booking: FlightBooking): ExtractedBooking {
  return {
    kind: "flight",
    booking,
    async save(tx, context) {
      const bookingId = await insertBooking(tx, context, { kind: "flight", ...booking });
      if (!bookingId) return "matched";
      await tx.insert(flightSegments).values(
        booking.segments.map((segment, position) => ({
          bookingId,
          position,
          airline: segment.airline,
          flightNumber: segment.flightNumber,
          departureAirport: segment.departure.airport,
          departureLocal: segment.departure.localTime,
          departureTimeZone: segment.departure.timeZone,
          departureAt: new Date(segment.departure.at),
          arrivalAirport: segment.arrival.airport,
          arrivalLocal: segment.arrival.localTime,
          arrivalTimeZone: segment.arrival.timeZone,
          arrivalAt: new Date(segment.arrival.at),
        })),
      );
      return "added";
    },
  };
}
