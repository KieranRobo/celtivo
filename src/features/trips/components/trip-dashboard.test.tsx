import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { TripBooking } from "@/features/bookings/schema";
import type { InboundEmail } from "@/features/inbound/schema";

import type { Trip } from "../schema";
import { TripDashboard } from "./trip-dashboard";

const trip: Trip = {
  id: "1",
  slug: "ski-trip-2027-k3x9q",
  name: "Ski Trip 2027",
  destination: "Chamonix, France",
  groupSize: "9-15",
  createdAt: "2026-10-29T12:00:00.000Z",
  url: "https://celtivo.com/trip/ski-trip-2027-k3x9q",
  inviteUrl: "https://celtivo.com/join/ski-trip-2027-k3x9q",
  inboundAddress: "ski-trip-2027-7hd2kq9x@celtivo.space",
};

const emails: InboundEmail[] = [
  {
    id: "e1",
    subject: "Your booking at Chalet Marmotte",
    fromName: "Kieran",
    fromAddress: "kieran@example.com",
    receivedAt: "2026-10-29T09:30:00.000Z",
    status: "extracted",
  },
];

describe("TripDashboard", () => {
  it("shows what the organiser entered", () => {
    render(<TripDashboard trip={trip} bookings={[]} emails={[]} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ski Trip 2027");
    expect(screen.getByText("Created 29 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Chamonix, France")).toBeInTheDocument();
    expect(screen.getByText("9–15 people")).toBeInTheDocument();
    // No rough dates were given.
    expect(screen.getByText("Not set yet")).toBeInTheDocument();
  });

  it("copies the trip link", async () => {
    const user = userEvent.setup();
    render(<TripDashboard trip={trip} bookings={[]} emails={[]} />);

    expect(screen.getByText(trip.url)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(await navigator.clipboard.readText()).toBe(trip.url);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("copies the forwarding address", async () => {
    const user = userEvent.setup();
    render(<TripDashboard trip={trip} bookings={[]} emails={[]} />);

    await user.click(screen.getByRole("button", { name: "Copy address" }));

    expect(await navigator.clipboard.readText()).toBe(trip.inboundAddress);
  });

  it("shows flights in local times, without the booking reference", () => {
    const bookings: TripBooking[] = [
      {
        id: "b1",
        kind: "flight",
        status: "pending_review",
        provider: "British Airways",
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
        ],
      },
    ];
    render(<TripDashboard trip={trip} bookings={bookings} emails={[]} />);

    const flights = screen.getByRole("region", { name: "Flights" });
    expect(flights).toHaveTextContent("LHR 07:15 → GVA 09:55");
    expect(flights).toHaveTextContent("Sat 6 Feb · BA730 · British Airways");
    expect(flights).toHaveTextContent("ROBERTSON/KIERAN MR");
    expect(flights).toHaveTextContent("Check this");
  });

  it("lists forwarded emails, or says there are none", () => {
    const { rerender } = render(<TripDashboard trip={trip} bookings={[]} emails={[]} />);
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();

    rerender(<TripDashboard trip={trip} bookings={[]} emails={emails} />);
    const list = screen.getByRole("region", { name: "Forwarded emails" });
    expect(list).toHaveTextContent("Your booking at Chalet Marmotte");
    expect(list).toHaveTextContent("Kieran · kieran@example.com");
    expect(list).toHaveTextContent("29 Oct, 09:30");
    expect(list).toHaveTextContent("Added");
  });
});
