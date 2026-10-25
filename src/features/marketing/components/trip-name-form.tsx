"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripDraft } from "@/features/trips/draft-store";
import { EXAMPLE_TRIP_NAME } from "@/features/trips/slug";
import { cn } from "@/lib/utils";

/**
 * The "name your trip" input + button pair. Typing updates the shared draft
 * (so the trip-board preview follows along); submitting opens the
 * create-trip screen with the name already filled in.
 */
export function TripNameForm({
  inputId,
  className,
  ...inputProps
}: { inputId?: string; className?: string } & Pick<ComponentProps<"input">, "aria-label">) {
  const router = useRouter();
  const name = useTripDraft((state) => state.name);
  const setName = useTripDraft((state) => state.setName);

  return (
    <form
      className={cn("flex max-w-[470px] items-stretch gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/trips/new");
      }}
    >
      <Input
        id={inputId}
        name="tripName"
        autoComplete="off"
        placeholder={EXAMPLE_TRIP_NAME}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="min-h-[46px] flex-1"
        {...inputProps}
      />
      <Button type="submit" size="lg">
        Create trip →
      </Button>
    </form>
  );
}
