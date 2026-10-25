import { ClosingCta } from "@/features/marketing/components/closing-cta";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";
import { Testimonial } from "@/features/marketing/components/testimonial";
import { WhatYouGet } from "@/features/marketing/components/what-you-get";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-100 bg-[radial-gradient(1000px_560px_at_86%_-140px,var(--color-accent-300),transparent_60%),radial-gradient(760px_620px_at_-6%_14%,var(--color-accent-2-300),transparent_56%),radial-gradient(900px_500px_at_50%_100%,var(--color-accent-2-200),transparent_62%)]">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <WhatYouGet />
        <Testimonial />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
