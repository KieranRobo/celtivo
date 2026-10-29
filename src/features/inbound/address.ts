import { randomSuffix, slugify } from "@/features/trips/slug";

/** Trip mail arrives on its own domain; Cloudflare's catch-all hands all of it to the Worker. */
export const INBOUND_DOMAIN = "celtivo.space";

const TOKEN_LENGTH = 8;
const TOKEN_PATTERN = new RegExp(`^[a-z0-9]{${TOKEN_LENGTH}}$`);

/** The secret part of a trip's address. Separate from the URL slug so it can be rotated. */
export function inboundToken(): string {
  return randomSuffix(TOKEN_LENGTH);
}

/** "Ski Trip 2027" + "7hd2kq9x" → "ski-trip-2027-7hd2kq9x@celtivo.space". */
export function inboundAddress(tripName: string, token: string): string {
  return `${slugify(tripName)}-${token}@${INBOUND_DOMAIN}`;
}

/**
 * The token from a recipient address, or null if it isn't a trip address. Only the part after
 * the last "-" counts: the name is there to reassure the sender, so renaming a trip (or a
 * mistyped name) doesn't break the address.
 */
export function tokenFromAddress(address: string): string | null {
  const [local, domain, ...rest] = address.trim().toLowerCase().split("@");
  if (!local || domain !== INBOUND_DOMAIN || rest.length > 0) return null;
  const token = local.slice(local.lastIndexOf("-") + 1);
  return TOKEN_PATTERN.test(token) ? token : null;
}
