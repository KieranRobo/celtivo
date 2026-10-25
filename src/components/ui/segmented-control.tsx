"use client";

import { RadioGroup } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SegmentedControlProps<T extends string> = Omit<
  ComponentProps<typeof RadioGroup.Root>,
  "value" | "defaultValue" | "onValueChange"
> & {
  options: readonly { value: T; label: string }[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
};

/** A row of mutually exclusive options, built on Radix RadioGroup. */
export function SegmentedControl<T extends string>({
  options,
  className,
  onValueChange,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <RadioGroup.Root
      orientation="horizontal"
      className={cn(
        "inline-flex self-start overflow-hidden rounded-control border border-neutral-300",
        className,
      )}
      onValueChange={(value) => onValueChange?.(value as T)}
      {...props}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "cursor-pointer px-4 py-[9px] text-[13.5px] text-neutral-900 transition-colors not-first:border-l not-first:border-neutral-300",
            "hover:bg-neutral-200",
            "data-[state=checked]:bg-accent-200 data-[state=checked]:text-accent-700 data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-accent-600)]",
            "focus-visible:outline-offset-[-2px]",
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
