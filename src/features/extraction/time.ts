/** "2027-02-06T07:15" or "2027-02-06T07:15:00": a wall-clock time with no offset. */
const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** True for an IANA zone this runtime knows, e.g. "Europe/London". */
export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return zone.includes("/") || zone === "UTC";
  } catch {
    return false;
  }
}

/** "2027-02-06T07:15:00" → "2027-02-06T07:15", or null if it isn't a valid local time. */
export function normalizeLocalTime(value: string): string | null {
  const match = LOCAL_TIME.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
  // Rejects 2027-02-30 and 25:00, which Date.UTC would silently roll over.
  if (date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d || +h > 23) return null;
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/**
 * The instant at which a zone's clocks show `localTime`. In the hour skipped by a DST jump
 * there is no such moment; this returns the time an hour later, as clocks would show.
 */
export function zonedTimeToInstant(localTime: string, zone: string): Date {
  const [date, time] = localTime.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Guess with the offset at the UTC reading, then correct once for DST transitions.
  let instant = asUtc - offsetAt(asUtc, zone);
  instant = asUtc - offsetAt(instant, zone);
  return new Date(instant);
}

/** The zone's UTC offset in milliseconds at `instant`. */
function offsetAt(instant: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallClock = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
}

/**
 * Splits an ISO time with an offset ("2027-02-06T07:15:00+01:00") into its wall-clock part
 * and instant. Returns null when there's no offset, since then the moment is ambiguous.
 */
export function splitOffsetTime(value: string): { localTime: string; at: Date } | null {
  const match = /^(.+?)(Z|[+-]\d{2}:?\d{2})$/.exec(value.trim());
  if (!match) return null;
  const localTime = normalizeLocalTime(match[1].replace(/\.\d+$/, ""));
  const at = new Date(value);
  return localTime && !Number.isNaN(at.getTime()) ? { localTime, at } : null;
}
