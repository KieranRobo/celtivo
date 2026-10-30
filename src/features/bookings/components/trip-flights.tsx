import { AirplaneTiltIcon } from "@phosphor-icons/react/ssr";

import { Tag } from "@/components/ui/tag";

import type { FlightEndpoint, TripBooking } from "../schema";

// Local times are stored as the airport's wall clock, so format them as UTC to show them
// exactly as written on the booking.
const day = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function wallClock(endpoint: FlightEndpoint) {
  return new Date(`${endpoint.localTime}:00Z`);
}

/** The trip's flights, in travel order. Extracted ones wait for review (phase 3). */
export function TripFlights({ bookings }: { bookings: TripBooking[] }) {
  const flights = bookings.filter((booking) => booking.kind === "flight");

  return (
    <section aria-labelledby="trip-flights" className="mt-10">
      <h2
        id="trip-flights"
        className="m-0 mb-3 text-[11px] font-normal tracking-[0.1em] text-accent-700 uppercase"
      >
        Flights
      </h2>
      {flights.length === 0 ? (
        <p className="m-0 rounded-control border border-dashed border-neutral-300 px-4 py-5 text-[14px] text-neutral-600">
          No flights yet. Forward a flight confirmation and it shows up here.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {flights.map((booking) => (
            <li
              key={booking.id}
              className="overflow-hidden rounded-control border border-neutral-300 bg-neutral-100"
            >
              <div className="flex flex-wrap items-center gap-2.5 border-b border-neutral-300 px-4 py-2.5">
                <span className="text-[14px] text-neutral-900">
                  {booking.provider ?? "Flight booking"}
                </span>
                {booking.status === "pending_review" && <Tag tone="subtle">Check this</Tag>}
                {booking.travellers.length > 0 && (
                  <span className="min-w-0 basis-full truncate text-[13px] text-neutral-600 sm:ml-auto sm:basis-auto">
                    {booking.travellers.join(", ")}
                  </span>
                )}
              </div>
              <ol className="m-0 list-none p-0">
                {booking.segments.map((segment) => (
                  <li
                    key={`${segment.flightNumber}-${segment.departure.at}`}
                    className="flex items-center gap-3 border-b border-neutral-300 px-4 py-3 last:border-b-0"
                  >
                    <AirplaneTiltIcon size={18} className="shrink-0 text-accent-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[15px] text-neutral-900 tabular-nums">
                        {segment.departure.airport} {clock.format(wallClock(segment.departure))}
                        {" → "}
                        {segment.arrival.airport} {clock.format(wallClock(segment.arrival))}
                        {segment.arrival.localTime.slice(0, 10) !==
                          segment.departure.localTime.slice(0, 10) && (
                          <span className="text-[13px] text-neutral-600">
                            {" "}
                            ({day.format(wallClock(segment.arrival))})
                          </span>
                        )}
                      </p>
                      <p className="m-0 text-[13px] text-neutral-600">
                        {day.format(wallClock(segment.departure))} · {segment.flightNumber}
                        {segment.airline ? ` · ${segment.airline}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
