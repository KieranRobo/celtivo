import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom theme keys in globals.css so that,
// e.g., `rounded-control` correctly overrides `rounded-md`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control"],
      shadow: ["card", "card-lg"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
