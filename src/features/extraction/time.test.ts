import { describe, expect, it } from "vitest";

import { isTimeZone, normalizeLocalTime, splitOffsetTime, zonedTimeToInstant } from "./time";

describe("zonedTimeToInstant", () => {
  it("applies the zone's offset, including summer time", () => {
    expect(zonedTimeToInstant("2027-02-06T07:15", "Europe/London").toISOString()).toBe(
      "2027-02-06T07:15:00.000Z",
    );
    expect(zonedTimeToInstant("2027-07-06T07:15", "Europe/London").toISOString()).toBe(
      "2027-07-06T06:15:00.000Z",
    );
    expect(zonedTimeToInstant("2027-02-06T09:55", "Europe/Zurich").toISOString()).toBe(
      "2027-02-06T08:55:00.000Z",
    );
    expect(zonedTimeToInstant("2027-02-06T22:30", "America/New_York").toISOString()).toBe(
      "2027-02-07T03:30:00.000Z",
    );
  });

  it("handles zones east of UTC across midnight", () => {
    expect(zonedTimeToInstant("2027-03-01T01:00", "Asia/Tokyo").toISOString()).toBe(
      "2027-02-28T16:00:00.000Z",
    );
  });

  it("moves a time in the skipped DST hour forward", () => {
    // Clocks in London jump from 01:00 to 02:00 on 28 March 2027.
    expect(zonedTimeToInstant("2027-03-28T01:30", "Europe/London").toISOString()).toBe(
      "2027-03-28T01:30:00.000Z",
    );
  });
});

describe("normalizeLocalTime", () => {
  it("accepts minutes or seconds precision", () => {
    expect(normalizeLocalTime("2027-02-06T07:15")).toBe("2027-02-06T07:15");
    expect(normalizeLocalTime(" 2027-02-06T07:15:00 ")).toBe("2027-02-06T07:15");
  });

  it("rejects offsets and impossible dates", () => {
    expect(normalizeLocalTime("2027-02-06T07:15+01:00")).toBeNull();
    expect(normalizeLocalTime("2027-02-30T07:15")).toBeNull();
    expect(normalizeLocalTime("2027-02-06T25:00")).toBeNull();
    expect(normalizeLocalTime("6 Feb 2027 07:15")).toBeNull();
  });
});

describe("isTimeZone", () => {
  it("knows IANA zones and nothing else", () => {
    expect(isTimeZone("Europe/London")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Europe/Atlantis")).toBe(false);
    expect(isTimeZone("GMT+1")).toBe(false);
    expect(isTimeZone("")).toBe(false);
  });
});

describe("splitOffsetTime", () => {
  it("keeps the wall clock and the instant", () => {
    expect(splitOffsetTime("2027-02-06T09:55:00+01:00")).toEqual({
      localTime: "2027-02-06T09:55",
      at: new Date("2027-02-06T08:55:00Z"),
    });
  });

  it("needs an offset", () => {
    expect(splitOffsetTime("2027-02-06T09:55:00")).toBeNull();
  });
});
