export const EXAMPLE_TRIP_NAME = "Ski Trip 2027";

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

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

/** A trip's URL slug: its name plus five random characters ("ski-trip-2027-k3x9q"). */
export function tripSlug(name: string): string {
  const suffix = Array.from(
    crypto.getRandomValues(new Uint8Array(5)),
    (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length],
  ).join("");
  return `${slugify(name)}-${suffix}`;
}

/** The trip's display title: what the organiser typed, or the example. */
export function tripTitle(name: string): string {
  return name.trim() || EXAMPLE_TRIP_NAME;
}
