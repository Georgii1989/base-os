import { describe, expect, it } from "vitest";
import {
  buildPortfolioSwapBuyHref,
  buildPortfolioSwapSellHref,
  buildSwapTabHref,
  parseSwapPrefillParams,
  swapPrefillToState,
} from "@/lib/swapPrefill";

describe("swapPrefill", () => {
  it("builds swap tab href with sell and buy", () => {
    expect(buildSwapTabHref({ sell: "eth", buy: "chainlink" })).toBe(
      "/?tab=swap&sell=eth&buy=chainlink"
    );
  });

  it("parses prefill params", () => {
    const params = new URLSearchParams("tab=swap&sell=0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196");
    expect(parseSwapPrefillParams(params)?.sell).toMatch(/^0x88fb/i);
  });

  it("maps preset id to swap state", () => {
    const state = swapPrefillToState({ sell: "chainlink", buy: "eth" });
    expect(state?.sellPreset).toBe("chainlink");
    expect(state?.buyPreset).toBe("eth");
    expect(state?.sellCustom).toBe("");
  });

  it("maps custom address to custom preset", () => {
    const addr = "0x1234567890123456789012345678901234567890";
    const state = swapPrefillToState({ sell: addr });
    expect(state?.sellPreset).toBe("custom");
    expect(state?.sellCustom).toBe(addr);
  });

  it("portfolio href sells token for eth", () => {
    const href = buildPortfolioSwapSellHref("0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196");
    expect(href).toContain("tab=swap");
    expect(href).toContain("sell=chainlink");
    expect(href).toContain("buy=eth");
  });

  it("portfolio href buys token with eth", () => {
    const href = buildPortfolioSwapBuyHref("0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196");
    expect(href).toContain("sell=eth");
    expect(href).toContain("buy=chainlink");
  });
});
