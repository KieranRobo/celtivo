import { TripNameForm } from "./trip-name-form";

export function ClosingCta() {
  return (
    <section className="container-page pt-6 pb-[72px]">
      <h2 className="m-0 mb-3 text-[30px] leading-[1.2] tracking-[-0.015em] text-neutral-900">
        Name the trip. We&apos;ll handle the herding.
      </h2>
      <p className="mb-7 max-w-[52ch] text-[15.5px] leading-7 text-neutral-700">
        Takes about forty seconds. The group chat can stay — it just won&apos;t have to do any work.
      </p>
      <TripNameForm aria-label="Trip name" />
    </section>
  );
}
