import { describe, expect, it } from "vitest";
import {
  isLikelySpamToken,
  sortPortfolioTokens,
  type PortfolioToken,
} from "@/lib/walletPortfolioFetch";

describe("isLikelySpamToken", () => {
  it("flags airdrop-style names", () => {
    expect(isLikelySpamToken("Claim AERO", "AERO")).toBe(true);
    expect(isLikelySpamToken("Degen", "DEGEN")).toBe(false);
  });
});

describe("sortPortfolioTokens", () => {
  it("sorts by USD value descending", () => {
    const tokens: PortfolioToken[] = [
      {
        address: "0x0000000000000000000000000000000000000001",
        name: "Low",
        symbol: "LOW",
        decimals: 18,
        balanceRaw: "1000",
        balanceFormatted: "1",
        priceUsd: 1,
        valueUsd: 1,
        iconUrl: null,
      },
      {
        address: "0x0000000000000000000000000000000000000002",
        name: "High",
        symbol: "HIGH",
        decimals: 18,
        balanceRaw: "1000",
        balanceFormatted: "1",
        priceUsd: 10,
        valueUsd: 100,
        iconUrl: null,
      },
    ];
    const sorted = sortPortfolioTokens(tokens);
    expect(sorted[0]?.symbol).toBe("HIGH");
  });
});
