import { describe, expect, it } from "vitest";
import { canAdvanceFromStep, nextLaunchStep, prevLaunchStep } from "@/lib/launchKitSteps";

describe("launchKitSteps", () => {
  it("advances through wizard steps", () => {
    expect(nextLaunchStep("intro")).toBe("identity");
    expect(nextLaunchStep("supply")).toBe("review");
    expect(nextLaunchStep("review")).toBe(null);
    expect(prevLaunchStep("supply")).toBe("identity");
  });

  it("validates identity step", () => {
    expect(canAdvanceFromStep("identity", { name: "", symbol: "", supplyWhole: "1" })).toBe(false);
    expect(canAdvanceFromStep("identity", { name: "My Token", symbol: "MTK", supplyWhole: "1" })).toBe(true);
  });
});
