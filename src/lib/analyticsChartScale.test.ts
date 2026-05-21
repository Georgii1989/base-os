import { describe, expect, it } from "vitest";
import { buildYAxisTicks, pickXAxisIndices } from "@/lib/analyticsChartScale";

describe("analyticsChartScale", () => {
  it("builds ascending Y ticks", () => {
    const ticks = buildYAxisTicks(4_000_000_000, 4_600_000_000, 5);
    expect(ticks[0]).toBeLessThanOrEqual(4_000_000_000);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(4_600_000_000);
  });

  it("picks spread X indices", () => {
    const idx = pickXAxisIndices(90, 5);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(89);
  });
});
