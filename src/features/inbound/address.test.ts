import { describe, expect, it } from "vitest";

import { inboundAddress, inboundToken, tokenFromAddress } from "./address";

describe("inboundAddress", () => {
  it("puts the trip's name before its token", () => {
    expect(inboundAddress("Ski Trip 2027", "7hd2kq9x")).toBe(
      "ski-trip-2027-7hd2kq9x@celtivo.space",
    );
  });

  it("round-trips through tokenFromAddress", () => {
    const token = inboundToken();
    expect(tokenFromAddress(inboundAddress("Lisbon", token))).toBe(token);
  });
});

describe("tokenFromAddress", () => {
  it("reads the token after the last hyphen, ignoring the name", () => {
    expect(tokenFromAddress("ski-trip-2027-7hd2kq9x@celtivo.space")).toBe("7hd2kq9x");
    expect(tokenFromAddress("renamed-trip-7hd2kq9x@celtivo.space")).toBe("7hd2kq9x");
    expect(tokenFromAddress("7hd2kq9x@celtivo.space")).toBe("7hd2kq9x");
  });

  it("ignores case and surrounding space", () => {
    expect(tokenFromAddress("  Ski-Trip-7HD2KQ9X@Celtivo.Space ")).toBe("7hd2kq9x");
  });

  it("rejects other domains and malformed tokens", () => {
    expect(tokenFromAddress("ski-trip-7hd2kq9x@celtivo.com")).toBeNull();
    expect(tokenFromAddress("ski-trip-7hd2@celtivo.space")).toBeNull();
    expect(tokenFromAddress("ski-trip-7hd2kq9x!@celtivo.space")).toBeNull();
    expect(tokenFromAddress("not-an-address")).toBeNull();
    expect(tokenFromAddress("a@b@celtivo.space")).toBeNull();
  });
});
