import { describe, expect, it } from "vitest";

import { createTripSchema } from "./schema";

describe("createTripSchema", () => {
  it("accepts a name and group size on their own", () => {
    const result = createTripSchema.safeParse({ name: "Ski Trip 2027", groupSize: "9-15" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = createTripSchema.safeParse({ name: "   ", groupSize: "9-15" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Give the trip a name");
  });

  it("rejects an unknown group size", () => {
    const result = createTripSchema.safeParse({ name: "Trip", groupSize: "100" });
    expect(result.success).toBe(false);
  });
});
