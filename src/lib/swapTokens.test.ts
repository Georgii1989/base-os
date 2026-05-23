import { describe, expect, it } from "vitest";
import {
  isNativeEthToken,
  NATIVE_ETH,
  resolveSwapToken,
  SWAP_TOKEN_PRESETS,
} from "@/lib/swapTokens";

describe("swapTokens", () => {
  it("recognizes native ETH sentinel", () => {
    expect(isNativeEthToken(NATIVE_ETH)).toBe(true);
  });

  it("resolves LINK preset", () => {
    const t = resolveSwapToken("chainlink");
    expect(t?.symbol).toBe("LINK");
    expect(t?.decimals).toBe(18);
  });

  it("rejects invalid custom address", () => {
    expect(resolveSwapToken("custom", "0xbad")).toBeNull();
  });

  it("has CMC Base top 30 plus native ETH", () => {
    expect(SWAP_TOKEN_PRESETS.length).toBe(31);
    expect(SWAP_TOKEN_PRESETS[0]?.symbol).toBe("ETH");
    expect(SWAP_TOKEN_PRESETS.some((t) => t.symbol === "LINK")).toBe(true);
    expect(SWAP_TOKEN_PRESETS.some((t) => t.symbol === "AERO")).toBe(true);
  });
});
