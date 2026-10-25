import { Tag } from "@/components/ui/tag";

import { TripBoardPreview } from "./trip-board-preview";
import { TripNameForm } from "./trip-name-form";

export function Hero() {
  return (
    <section className="container-page grid items-start gap-x-[clamp(32px,5vw,80px)] gap-y-14 pt-16 pb-24 lg:grid-cols-2">
      <div>
        <h1 className="m-0 mb-6 -ml-[0.05em] text-[clamp(40px,4.6vw,62px)] leading-[1.06] tracking-[-0.022em] text-neutral-900">
          <span className="block">Nine friends. One trip.</span>
          <span className="block text-accent-600">No 400-message group chat.</span>
        </h1>
        <p className="mb-8 max-w-[44ch] text-[17.5px] leading-7 text-neutral-700">
          Celtivo is one place to find a place everyone actually agrees on, book it, and collect
          everyone&apos;s share — without you fronting €2,600 and becoming the group treasurer.
        </p>

        <div className="max-w-[470px]">
          <label
            htmlFor="hero-trip-name"
            className="mb-[9px] block text-xs tracking-[0.06em] text-accent-700 uppercase"
          >
            Start by naming it
          </label>
          <TripNameForm inputId="hero-trip-name" />
          <p className="mt-3 text-[13px] leading-5 text-neutral-600">
            Free to start · no card · invite the group with one link
          </p>
        </div>

        <ul className="mt-8 flex list-none flex-wrap gap-2 p-0" aria-label="Made for">
          <li>
            <Tag tone="accent">Ski trips</Tag>
          </li>
          <li>
            <Tag tone="section">Bachelor &amp; bachelorette</Tag>
          </li>
          <li>
            <Tag tone="soft">Anything with a group chat</Tag>
          </li>
        </ul>
      </div>

      <TripBoardPreview />
    </section>
  );
}
