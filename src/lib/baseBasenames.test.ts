import { describe, expect, it } from "vitest";
import { isBasenameLike } from "@/lib/baseBasenames";

describe("isBasenameLike", () => {
  it("accepts .base.eth and .bas.eth", () => {
    expect(isBasenameLike("alice.base.eth")).toBe(true);
    expect(isBasenameLike("1x321.base.eth")).toBe(true);
    expect(isBasenameLike("bob.bas.eth")).toBe(true);
  });

  it("rejects plain addresses and other TLDs", () => {
    expect(isBasenameLike("0x8655520b4b19187038aC9a4f560da0979Cc1E95C")).toBe(false);
    expect(isBasenameLike("vitalik.eth")).toBe(false);
  });
});
