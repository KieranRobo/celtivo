import Link from "next/link";

import { cn } from "@/lib/utils";

const sizes = {
  md: { mark: "size-[22px] text-[11px]", word: "text-lg" },
  sm: { mark: "size-5 text-[10px]", word: "text-base" },
};

/** The Celtivo wordmark: an accent "C" tile beside the name. */
export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-[9px] font-heading font-medium tracking-[-0.02em] text-neutral-900 no-underline hover:text-neutral-900",
        sizes[size].word,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-[6px] bg-accent-600 text-accent-100",
          sizes[size].mark,
        )}
      >
        C
      </span>
      Celtivo
    </Link>
  );
}
