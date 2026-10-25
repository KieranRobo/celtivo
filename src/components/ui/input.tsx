import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "min-h-[42px] w-full rounded-control border border-neutral-300 bg-neutral-100 px-3.5 py-2 text-base text-neutral-900 caret-accent-600 transition-colors",
        "placeholder:text-neutral-500 hover:border-neutral-500",
        "focus-visible:border-accent-600 focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent-400)_35%,transparent)] focus-visible:outline-none",
        "aria-invalid:border-danger-600",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}
