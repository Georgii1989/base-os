import { describe, expect, it } from "vitest";
import { barWidthPct } from "./barScale";

describe("barWidthPct", () => {
  it("uses linear scale for similar magnitudes", () => {
    const values = [100, 80, 50];
    expect(barWidthPct(100, values)).toBe(100);
    expect(barWidthPct(50, values)).toBe(50);
  });

  it("separates small DEX volumes on log scale", () => {
    const values = [584_930_000, 110_260_000, 920_500, 2_600];
    const maverick = barWidthPct(920_500, values);
    const pancake = barWidthPct(2_600, values);
    expect(maverick).toBeGreaterThan(pancake * 3);
    expect(barWidthPct(584_930_000, values)).toBe(100);
  });

  it("does not flatten mid-tier protocols to the same width", () => {
    const values = [584_930_000, 3_430_000, 520_200, 2_600];
    const balancer = barWidthPct(3_430_000, values);
    const curve = barWidthPct(520_200, values);
    expect(balancer).toBeGreaterThan(curve + 5);
  });
});
