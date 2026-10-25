import { describe, expect, it } from "vitest";

import { slugify, tripTitle } from "./slug";

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

describe("tripTitle", () => {
  it("uses the typed name, trimmed", () => {
    expect(tripTitle("  Stag do  ")).toBe("Stag do");
  });

  it("falls back to the example name when empty", () => {
    expect(tripTitle("   ")).toBe("Ski Trip 2027");
  });
});
