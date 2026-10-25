import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTripDraft } from "@/features/trips/draft-store";

import { TripBoardPreview } from "./trip-board-preview";
import { TripNameForm } from "./trip-name-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("TripNameForm", () => {
  beforeEach(() => {
    useTripDraft.getState().reset();
    push.mockClear();
  });

  it("drives the trip-board preview as you type", async () => {
    render(
      <>
        <TripNameForm aria-label="Trip name" />
        <TripBoardPreview />
      </>,
    );

    expect(screen.getByText("celtivo.com/trip/ski-trip-2027")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Trip name"), "Lads in Lisbon");

    expect(useTripDraft.getState().name).toBe("Lads in Lisbon");
    expect(screen.getByRole("img", { name: /trip board for Lads in Lisbon/ })).toBeInTheDocument();
    expect(screen.getByText("celtivo.com/trip/lads-in-lisbon")).toBeInTheDocument();
  });

  it("opens the create-trip screen on submit", async () => {
    render(<TripNameForm aria-label="Trip name" />);

    await userEvent.type(screen.getByLabelText("Trip name"), "Hen do{Enter}");

    expect(push).toHaveBeenCalledWith("/trips/new");
  });
});
