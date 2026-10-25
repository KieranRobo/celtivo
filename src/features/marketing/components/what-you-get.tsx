import { cn } from "@/lib/utils";

const pillars = [
  {
    n: "01",
    title: "Plan",
    copy: "Dates, destinations and stays on one board the whole group can see. Polls settle the arguments; the timeline shows who has actually done anything.",
    card: "bg-accent-200 border-[color-mix(in_srgb,var(--color-accent-400)_55%,transparent)]",
    badge: "bg-accent-600 text-accent-100",
    heading: "text-neutral-900",
    body: "text-accent-800",
  },
  {
    n: "02",
    title: "Book",
    copy: "Book the winning stay from inside the trip — held prices, group-size aware, one confirmation the whole group can read instead of forwarding around.",
    card: "bg-section border-section-ghost",
    badge: "bg-section-ghost text-neutral-100",
    heading: "text-neutral-100",
    body: "text-[color-mix(in_srgb,var(--color-neutral-100)_80%,transparent)]",
  },
  {
    n: "03",
    title: "Manage",
    copy: "Shares, payment status, documents and arrival times, all tracked. Reminders go out automatically — so they come from Celtivo instead of from you.",
    card: "bg-accent-2-200 border-[color-mix(in_srgb,var(--color-accent-2-500)_45%,transparent)]",
    badge: "bg-accent-2-600 text-accent-2-100",
    heading: "text-neutral-900",
    body: "text-accent-2-800",
  },
];

export function WhatYouGet() {
  return (
    <section id="what" aria-labelledby="what-heading" className="container-page pt-[88px] pb-16">
      <h2
        id="what-heading"
        className="mb-7 font-sans text-[13px] font-normal tracking-[0.06em] text-accent-700 uppercase"
      >
        What you get
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        {pillars.map((pillar) => (
          <article
            key={pillar.n}
            className={cn("rounded-lg border px-[26px] pt-[30px] pb-8", pillar.card)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mb-[18px] inline-flex size-[34px] items-center justify-center rounded-[9px] text-[13px] tabular-nums",
                pillar.badge,
              )}
            >
              {pillar.n}
            </span>
            <h3
              className={cn(
                "m-0 mb-2.5 text-2xl leading-[1.2] tracking-[-0.012em]",
                pillar.heading,
              )}
            >
              {pillar.title}
            </h3>
            <p className={cn("m-0 text-[15.5px] leading-[25px]", pillar.body)}>{pillar.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
