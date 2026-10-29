import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
};

describe("TripDashboard", () => {
  it("shows what the organiser entered", () => {
    render(<TripDashboard trip={trip} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ski Trip 2027");
    expect(screen.getByText("Created 29 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Chamonix, France")).toBeInTheDocument();
    expect(screen.getByText("9–15 people")).toBeInTheDocument();
    // No rough dates were given.
    expect(screen.getByText("Not set yet")).toBeInTheDocument();
  });

  it("copies the trip link", async () => {
    const user = userEvent.setup();
    render(<TripDashboard trip={trip} />);

    expect(screen.getByText(trip.url)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(await navigator.clipboard.readText()).toBe(trip.url);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
