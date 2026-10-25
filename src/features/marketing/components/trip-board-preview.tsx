"use client";

import { Tag } from "@/components/ui/tag";
import { useTripDraft } from "@/features/trips/draft-store";
import { slugify, tripTitle } from "@/features/trips/slug";
import { cn } from "@/lib/utils";

const avatars = [
  { initials: "AL", className: "bg-accent-500 text-accent-100" },
  { initials: "JR", className: "bg-neutral-300 text-neutral-800" },
  { initials: "KM", className: "bg-accent-300 text-accent-800" },
  { initials: "TP", className: "bg-accent-2-300 text-accent-2-800" },
  { initials: "+4", className: "bg-neutral-300 text-neutral-700" },
];

const stays = [
  { name: "Chalet Marmotte", price: "€218 / person", votes: 7, share: 78, leading: true },
  { name: "Hôtel Verte", price: "€164 / person", votes: 2, share: 22, leading: false },
];

const sectionLabel = "text-[11px] tracking-[0.1em] text-accent-700 uppercase";

/** An illustrative trip board whose title and URL follow the typed trip name. */
export function TripBoardPreview() {
  const name = useTripDraft((state) => state.name);
  const title = tripTitle(name);
  const slug = slugify(title);

  return (
    <figure className="animate-rise">
      <div
        role="img"
        aria-label={`Example trip board for ${title}: voting on where to stay, and everyone's share of the cost`}
        className="overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-card"
      >
        <div
          aria-hidden="true"
          className="flex items-center gap-2 border-b border-section-ghost bg-section px-4 py-3"
        >
          <span className="size-[9px] rounded-full bg-accent-500" />
          <span className="size-[9px] rounded-full bg-section-ghost" />
          <span className="flex-1" />
          <span className="truncate text-[11px] text-[color-mix(in_srgb,var(--color-neutral-100)_72%,transparent)]">
            celtivo.com/trip/{slug}
          </span>
        </div>

        <div aria-hidden="true">
          <div className="flex items-start gap-4 px-[22px] pt-[22px] pb-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <Tag tone="subtle">Planning</Tag>
                <span className="text-xs text-neutral-600 tabular-nums">
                  6–13 Feb 2027 · Chamonix
                </span>
              </div>
              <h2 className="m-0 truncate text-[26px] leading-[1.15] tracking-[-0.015em] text-neutral-900">
                {title}
              </h2>
            </div>
            <div className="flex flex-row-reverse">
              {avatars.toReversed().map((avatar, index) => (
                <span
                  key={avatar.initials}
                  className={cn(
                    "inline-flex size-[30px] items-center justify-center rounded-full border-2 border-neutral-100 text-[11px]",
                    index < avatars.length - 1 && "-ml-[9px]",
                    avatar.className,
                  )}
                >
                  {avatar.initials}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3.5 rule-fade" />

          <div className="px-[22px] pt-[18px] pb-5">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <span className={sectionLabel}>Where we&apos;re staying · voting</span>
              <span className="text-xs whitespace-nowrap text-neutral-600">9 of 9 voted</span>
            </div>

            {stays.map((stay) => (
              <div
                key={stay.name}
                className={cn(
                  "mb-2 flex items-center gap-3.5 rounded-control px-3 py-[11px]",
                  stay.leading
                    ? "bg-accent-200 shadow-[inset_0_0_0_1px_var(--color-accent-400)]"
                    : "shadow-[inset_0_0_0_1px_var(--color-neutral-300)]",
                )}
              >
                <div className="grid h-10 w-12 flex-none place-items-center rounded-[7px] border border-dashed border-neutral-400 bg-neutral-200 text-[9px] tracking-[0.08em] text-neutral-600">
                  IMG
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-[14.5px] font-medium text-neutral-900">{stay.name}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        stay.leading ? "text-accent-800" : "text-neutral-600",
                      )}
                    >
                      {stay.price}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-2 h-1 overflow-hidden rounded-full",
                      stay.leading
                        ? "bg-[color-mix(in_srgb,var(--color-accent-400)_45%,transparent)]"
                        : "bg-neutral-200",
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full",
                        stay.leading ? "bg-accent-600" : "bg-neutral-400",
                      )}
                      style={{ width: `${stay.share}%` }}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    "flex-none text-xs tabular-nums",
                    stay.leading ? "text-accent-800" : "text-neutral-600",
                  )}
                >
                  {stay.votes} votes
                </span>
              </div>
            ))}

            <p className="mt-2.5 text-[12.5px] leading-[19px] text-neutral-600">
              Chalet Marmotte wins. Held for 24h — book it before Dave changes his mind again.
            </p>
          </div>

          <div className="border-t border-neutral-300 bg-neutral-200 px-[22px] pt-[18px] pb-[22px]">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className={sectionLabel}>Everyone&apos;s share</span>
              <span className="text-[13px] text-neutral-900 tabular-nums">
                €1,744 <span className="text-neutral-600">/ €2,616</span>
              </span>
            </div>
            <div className="mb-3 flex h-2 gap-[3px]">
              <div className="flex-[6] rounded-full bg-accent-600" />
              <div className="flex-[3] rounded-full bg-neutral-300" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-neutral-700">
                6 paid · 3 still “about to do it”
              </span>
              <span className="rounded-md border border-neutral-300 bg-neutral-100 px-[11px] py-[5px] font-heading text-[12.5px] font-medium whitespace-nowrap text-neutral-800">
                Nudge them
              </span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mx-1 mt-3 text-xs text-neutral-600">
        Your trip board — everything in one link, no spreadsheet.
      </figcaption>
    </figure>
  );
}
