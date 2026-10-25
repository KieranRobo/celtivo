import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: ReactNode;
  /** Shown after the label in a lighter tone, e.g. "optional". */
  hint?: ReactNode;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "children">;

/** A labelled form control with an optional hint and error message. */
export function Field({ label, hint, htmlFor, error, className, children, ...props }: FieldProps) {
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <label htmlFor={htmlFor} className="mb-[5px] block text-xs text-neutral-700">
        {label}
        {hint && <span className="text-neutral-500"> — {hint}</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
