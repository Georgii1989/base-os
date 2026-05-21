import { describe, expect, it } from "vitest";
import { validateTokenLaunchForm } from "@/lib/tokenLaunchValidate";

describe("validateTokenLaunchForm", () => {
  it("accepts valid input", () => {
    const r = validateTokenLaunchForm({
      name: "My Coin",
      symbol: "myc",
      supplyWhole: "1000000",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.symbol).toBe("MYC");
      expect(r.name).toBe("My Coin");
    }
  });

  it("rejects empty symbol", () => {
    const r = validateTokenLaunchForm({ name: "X", symbol: "", supplyWhole: "1" });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid symbol chars", () => {
    const r = validateTokenLaunchForm({ name: "X", symbol: "AB-$", supplyWhole: "1" });
    expect(r.ok).toBe(false);
  });
});
