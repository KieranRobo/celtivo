const steps = [
  {
    n: "01",
    title: "Name it, invite them",
    copy: "One link. Everyone lands on the same board — no accounts to chase, no screenshots of screenshots.",
  },
  {
    n: "02",
    title: "Agree on a place",
    copy: "Shortlist stays side by side, vote, and watch the winner rise. Whoever votes last no longer gets to complain.",
  },
  {
    n: "03",
    title: "Everyone pays their own share",
    copy: "Celtivo splits the total and collects from each person directly. You never front the money or send the reminder.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="bg-section bg-[radial-gradient(900px_420px_at_85%_-40%,color-mix(in_srgb,var(--color-section-glow)_75%,transparent),transparent_64%)] py-16 text-neutral-100"
    >
      <div className="container-page">
        <h2
          id="how-heading"
          className="mb-9 block font-sans text-xs font-normal tracking-[0.08em] text-accent-300 uppercase"
        >
          How it works
        </h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-x-[clamp(28px,4vw,64px)] gap-y-9 p-0">
          {steps.map((step) => (
            <li key={step.n}>
              <div className="mb-3.5 flex items-center gap-3" aria-hidden="true">
                <span className="text-[13px] text-neutral-100 tabular-nums">{step.n}</span>
                <span className="h-px w-10 bg-[color-mix(in_srgb,var(--color-neutral-100)_45%,transparent)]" />
              </div>
              <h3 className="m-0 mb-2.5 text-[23px] leading-[1.18] tracking-[-0.012em] text-neutral-100">
                {step.title}
              </h3>
              <p className="m-0 max-w-[34ch] text-[15px] leading-[25px] text-[color-mix(in_srgb,var(--color-neutral-100)_78%,transparent)]">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
