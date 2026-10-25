import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTripDraft } from "../draft-store";
import { CreateTripForm } from "./create-trip-form";

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateTripForm />
    </QueryClientProvider>,
  );
}

describe("CreateTripForm", () => {
  beforeEach(() => {
    useTripDraft.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("carries over the name typed on the landing page", () => {
    useTripDraft.getState().setName("Ski Trip 2027");
    renderForm();

    expect(screen.getByLabelText("Trip name")).toHaveValue("Ski Trip 2027");
    expect(screen.getByRole("button", { name: "Create Ski Trip 2027" })).toBeInTheDocument();
    expect(screen.getByText("celtivo.com/join/ski-trip-2027")).toBeInTheDocument();
  });

  it("asks for a name before creating", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /^Create/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Give the trip a name");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the trip and shows its invite link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "1",
        slug: "lisbon",
        name: "Lisbon",
        groupSize: "5-8",
        inviteUrl: "https://celtivo.com/join/lisbon",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    await userEvent.type(screen.getByLabelText("Trip name"), "Lisbon");
    await userEvent.click(screen.getByRole("radio", { name: "5–8" }));
    await userEvent.click(screen.getByRole("button", { name: "Create Lisbon" }));

    expect(await screen.findByText("https://celtivo.com/join/lisbon")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      name: "Lisbon",
      groupSize: "5-8",
    });
    expect(screen.getByRole("button", { name: "Copy invite link" })).toBeInTheDocument();
  });
});
