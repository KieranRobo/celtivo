import { describe, expect, it } from "vitest";

import { slugify, tripSlug, tripTitle } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Ski Trip 2027")).toBe("ski-trip-2027");
  });

  it("strips accents and stray punctuation", () => {
    expect(slugify("  Hôtel Verte — Chamonix!  ")).toBe("hotel-verte-chamonix");
  });

  it("falls back to the example slug when nothing is left", () => {
    expect(slugify("!!!")).toBe("ski-trip-2027");
  });
});

describe("tripSlug", () => {
  it("adds five random characters to the name's slug", () => {
    expect(tripSlug("Ski Trip 2027")).toMatch(/^ski-trip-2027-[a-z0-9]{5}$/);
  });

  it("rolls a different suffix each time", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => tripSlug("Lisbon")));
    expect(slugs.size).toBeGreaterThan(1);
  });
});

describe("tripTitle", () => {
  it("uses the typed name, trimmed", () => {
    expect(tripTitle("  Stag do  ")).toBe("Stag do");
  });

  it("falls back to the example name when empty", () => {
    expect(tripTitle("   ")).toBe("Ski Trip 2027");
  });
});
