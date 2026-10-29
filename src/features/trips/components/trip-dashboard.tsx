import { cn } from "@/lib/utils";

import { GROUP_SIZES, type Trip } from "../schema";
import { CopyLink } from "./copy-link";

const createdDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** The trip's home: everything the organiser told us when creating it. */
export function TripDashboard({ trip }: { trip: Trip }) {
  const groupSize = GROUP_SIZES.find((size) => size.value === trip.groupSize)?.label;
  const details = [
    { label: "Where to", value: trip.destination },
    { label: "Rough dates", value: trip.roughDates },
    { label: "How many of you", value: groupSize && `${groupSize} people` },
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(320px,420px)]">
      <section className="px-[clamp(28px,4vw,56px)] pt-11 pb-12">
        <p className="m-0 mb-2.5 text-xs text-neutral-600 tabular-nums">
          Created {createdDate.format(new Date(trip.createdAt))}
        </p>
        <h1 className="m-0 mb-8 text-[32px] leading-[1.14] tracking-[-0.018em] break-words text-neutral-900">
          {trip.name}
        </h1>

        <dl className="m-0 grid gap-px overflow-hidden rounded-control border border-neutral-300 bg-neutral-300 sm:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label} className="bg-neutral-100 px-4 py-3.5">
              <dt className="mb-1 text-xs text-neutral-600">{detail.label}</dt>
              <dd
                className={cn(
                  "m-0 text-[15px] break-words",
                  detail.value ? "text-neutral-900" : "text-neutral-500",
                )}
              >
                {detail.value || "Not set yet"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <aside className="bg-section bg-[radial-gradient(600px_300px_at_90%_-10%,var(--color-section-glow),transparent_66%)] px-[clamp(24px,3vw,40px)] pt-11 pb-12">
        <h2 className="mb-3 block font-sans text-[11px] font-normal tracking-[0.1em] text-accent-300 uppercase">
          Share the trip
        </h2>
        <p className="m-0 mb-5 text-[13px] leading-5 text-[color-mix(in_srgb,var(--color-neutral-100)_74%,transparent)]">
          Drop this link in the group chat so everyone lands on this page.
        </p>
        <CopyLink url={trip.url} />
      </aside>
    </div>
  );
}

export function TripDashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading trip"
      className="grid lg:grid-cols-[1fr_minmax(320px,420px)]"
    >
      <div className="px-[clamp(28px,4vw,56px)] pt-11 pb-12">
        <div className="mb-3.5 h-3 w-28 animate-pulse rounded-sm bg-neutral-200" />
        <div className="mb-8 h-9 w-2/3 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-[70px] animate-pulse rounded-control bg-neutral-200" />
      </div>
      <div className="min-h-[200px] bg-section" />
    </div>
  );
}
