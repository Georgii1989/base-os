import { describe, expect, it } from "vitest";
import { buildOsTabUrl, parseAddressSearchParam, tabSupportsAddressParam } from "@/lib/osUrlParams";

const ADDR = "0x8655520b4b19187038aC9a4f560da0979Cc1E95C";

describe("parseAddressSearchParam", () => {
  it("returns checksummed address for valid 0x input", () => {
    expect(parseAddressSearchParam(ADDR)).toBe(ADDR);
  });

  it("returns null for missing or invalid input", () => {
    expect(parseAddressSearchParam(null)).toBeNull();
    expect(parseAddressSearchParam("")).toBeNull();
    expect(parseAddressSearchParam("not-an-address")).toBeNull();
  });
});

describe("tabSupportsAddressParam", () => {
  it("allows score, portfolio, guard", () => {
    expect(tabSupportsAddressParam("score")).toBe(true);
    expect(tabSupportsAddressParam("portfolio")).toBe(true);
    expect(tabSupportsAddressParam("guard")).toBe(true);
    expect(tabSupportsAddressParam("swap")).toBe(false);
  });
});

describe("buildOsTabUrl", () => {
  it("builds score deep link with address", () => {
    expect(
      buildOsTabUrl("score", {
        address: ADDR,
        origin: "https://app-base-os.vercel.app",
      })
    ).toBe(`https://app-base-os.vercel.app/?tab=score&address=${ADDR}`);
  });

  it("builds portfolio and guard deep links", () => {
    expect(buildOsTabUrl("portfolio", { address: ADDR })).toBe(`/?tab=portfolio&address=${ADDR}`);
    expect(buildOsTabUrl("guard", { address: ADDR })).toBe(`/?tab=guard&address=${ADDR}`);
  });

  it("omits address for non-address tabs", () => {
    expect(buildOsTabUrl("swap", { address: ADDR })).toBe("/?tab=swap");
  });
});
