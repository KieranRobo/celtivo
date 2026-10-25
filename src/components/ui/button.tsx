import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-1.5 border font-heading font-medium whitespace-nowrap no-underline transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-accent-600 bg-accent-600 text-accent-100 hover:border-accent-700 hover:bg-accent-700 hover:text-accent-100 active:border-accent-800 active:bg-accent-800",
        secondary:
          "border-neutral-300 bg-transparent text-neutral-800 hover:bg-neutral-200 hover:text-neutral-800 active:bg-neutral-300",
        ghost:
          "border-transparent bg-transparent px-1 text-accent-600 hover:bg-accent-200 hover:text-accent-700 active:bg-accent-300",
      },
      size: {
        sm: "rounded-md px-[11px] py-[5px] text-[12.5px] leading-[1.2]",
        md: "rounded-md px-2.5 py-1.5 text-sm leading-[1.2]",
        lg: "min-h-[46px] rounded-control px-5 text-[15px] leading-[1.2]",
        icon: "size-9 rounded-md p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a `<Link>`) with button styling. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
