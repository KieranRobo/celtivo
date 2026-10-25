export function Testimonial() {
  return (
    <section className="container-page pt-6 pb-[88px]">
      <figure className="m-0 rounded-lg bg-accent-600 bg-[radial-gradient(700px_320px_at_88%_-20%,var(--color-accent-500),transparent_62%)] px-[clamp(28px,4vw,60px)] py-[52px]">
        <blockquote className="m-0 max-w-[34ch] font-heading text-[clamp(24px,2.6vw,33px)] leading-[1.28] font-medium tracking-[-0.012em] text-accent-100">
          “I organised a nine-person ski trip and stayed friends with all nine. The money bit alone
          is worth it.”
        </blockquote>
        <figcaption className="mt-7 text-[15.5px] leading-7 text-accent-200">
          — Aoife L., professional trip organiser against her will
        </figcaption>
      </figure>
    </section>
  );
}
