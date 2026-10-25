import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const navLink = "whitespace-nowrap text-sm text-neutral-700 no-underline hover:text-accent-600";

export function SiteHeader() {
  return (
    <header className="relative z-[2] px-[max(28px,calc((100%-1240px)/2+28px))] py-4">
      <nav aria-label="Main" className="flex items-center gap-6">
        <Logo className="mr-auto" />
        <a href="#how" className={`${navLink} max-sm:hidden`}>
          How it works
        </a>
        <a href="#what" className={`${navLink} max-sm:hidden`}>
          What you get
        </a>
        <Link href="/sign-in" className={navLink}>
          Sign in
        </Link>
        <Button asChild>
          <Link href="/trips/new">Create a trip</Link>
        </Button>
      </nav>
    </header>
  );
}
