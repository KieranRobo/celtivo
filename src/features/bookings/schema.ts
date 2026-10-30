// Booking kinds the extraction pipeline can produce. Each kind has an extractor in
// features/extraction/extractors/ and its own detail table (flights → flight_segments).
export const bookingKindValues = ["flight"] as const;
export type BookingKind = (typeof bookingKindValues)[number];

/** Extracted bookings start as "pending_review" until someone in the group checks them. */
export const bookingStatusValues = ["pending_review", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatusValues)[number];

/** How a booking was read from its email. */
export const extractionPathValues = ["schema_org", "ai"] as const;
export type ExtractionPath = (typeof extractionPathValues)[number];

/** One end of a flight, in the airport's local time as written on the booking. */
export type FlightEndpoint = {
  /** IATA code, e.g. "LHR". */
  airport: string;
  /** Wall-clock time at the airport, "2027-02-06T07:15". */
  localTime: string;
  /** IANA zone, e.g. "Europe/London"; null when the email gave only a UTC offset. */
  timeZone: string | null;
  /** The same moment as an ISO instant. */
  at: string;
};

export type FlightSegment = {
  airline?: string;
  flightNumber: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
};

/** A booking as the trip dashboard shows it. The booking reference is deliberately left out. */
export type TripBooking = {
  id: string;
  kind: "flight";
  status: BookingStatus;
  provider?: string;
  travellers: string[];
  segments: FlightSegment[];
};
