import { describe, expect, it } from "vitest";
import { isNativeEthToken, NATIVE_ETH, resolveSwapToken } from "@/lib/swapTokens";

describe("swapTokens", () => {
  it("recognizes native ETH sentinel", () => {
    expect(isNativeEthToken(NATIVE_ETH)).toBe(true);
  });

  it("resolves USDC preset", () => {
    const t = resolveSwapToken("usdc");
    expect(t?.symbol).toBe("USDC");
    expect(t?.decimals).toBe(6);
  });

  it("rejects invalid custom address", () => {
    expect(resolveSwapToken("custom", "0xbad")).toBeNull();
  });
});
