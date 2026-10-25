import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const tagVariants = cva(
  "inline-flex items-center rounded-[6px] px-2.5 py-[3px] text-[11px] tracking-[0.02em]",
  {
    variants: {
      tone: {
        accent: "bg-accent-600 text-accent-100",
        section: "bg-section text-neutral-100",
        soft: "bg-accent-300 text-accent-800",
        subtle: "bg-accent-200 text-accent-800",
      },
    },
    defaultVariants: { tone: "subtle" },
  },
);

export function Tag({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return <span className={cn(tagVariants({ tone }), className)} {...props} />;
}
