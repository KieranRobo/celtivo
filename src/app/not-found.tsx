import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-screen flex-col items-start justify-center gap-6 py-16">
      <Logo />
      <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-[1.1] tracking-[-0.02em]">
        This bit of Celtivo isn&apos;t built yet.
      </h1>
      <p className="max-w-[44ch] text-[15.5px] leading-7 text-neutral-700">
        The page you were after doesn&apos;t exist — or doesn&apos;t exist yet.
      </p>
      <Button asChild size="lg">
        <Link href="/">Back to the start</Link>
      </Button>
    </main>
  );
}
