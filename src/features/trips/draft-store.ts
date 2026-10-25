"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type TripDraftState = {
  name: string;
  setName: (name: string) => void;
  reset: () => void;
};

/**
 * The trip name typed on the landing page. It drives the live trip-board
 * preview and carries straight into the create-trip screen. Kept in
 * sessionStorage so it survives the navigation and a refresh.
 */
export const useTripDraft = create<TripDraftState>()(
  persist(
    (set) => ({
      name: "",
      setName: (name) => set({ name }),
      reset: () => set({ name: "" }),
    }),
    {
      name: "celtivo-trip-draft",
      storage: createJSONStorage(() => sessionStorage),
      // Rehydrated after mount (see <TripDraftHydrator />) so server and
      // first client render match.
      skipHydration: true,
    },
  ),
);
