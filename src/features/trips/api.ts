"use client";

import { useMutation } from "@tanstack/react-query";

import type { CreateTripInput, Trip } from "./schema";

async function createTrip(input: CreateTripInput): Promise<Trip> {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Couldn't create the trip. Try again in a moment.");
  return response.json();
}

export function useCreateTrip() {
  return useMutation({ mutationFn: createTrip });
}
