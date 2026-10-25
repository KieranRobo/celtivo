export const EXAMPLE_TRIP_NAME = "Ski Trip 2027";

/** "Ski Trip 2027" → "ski-trip-2027". Falls back to the example's slug. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "ski-trip-2027";
}

/** The trip's display title: what the organiser typed, or the example. */
export function tripTitle(name: string): string {
  return name.trim() || EXAMPLE_TRIP_NAME;
}
