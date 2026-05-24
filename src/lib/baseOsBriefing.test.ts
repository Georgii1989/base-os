import { describe, expect, it } from "vitest";
import { buildBriefingItems } from "@/lib/baseOsBriefing";

describe("buildBriefingItems", () => {
  it("prompts connect when wallet disconnected", () => {
    const items = buildBriefingItems({ isConnected: false });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("connect");
  });

  it("prioritizes bridge when ETH on mainnet", () => {
    const items = buildBriefingItems({
      isConnected: true,
      ethOnMainnet: 0.5,
      ethOnBase: 0.01,
    });
    expect(items[0].id).toBe("bridge-eth");
  });

  it("includes guard action", () => {
    const items = buildBriefingItems({ isConnected: true, ethOnBase: 0 });
    expect(items.some((i) => i.id === "guard")).toBe(true);
  });
});
