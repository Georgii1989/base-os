import { describe, expect, it } from "vitest";
import { buildYAxisTicks, chartYDomain, pickXAxisIndices } from "@/lib/analyticsChartScale";

describe("analyticsChartScale", () => {
  it("builds ascending Y ticks", () => {
    const ticks = buildYAxisTicks(4_000_000_000, 4_600_000_000, 5);
    expect(ticks[0]).toBeLessThanOrEqual(4_000_000_000);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(4_600_000_000);
  });

  it("chartYDomain covers peaks above 4B when max is 5.35B", () => {
    const { yMax, yTicks } = chartYDomain(0, 5_350_000_000, 5);
    expect(yMax).toBeGreaterThanOrEqual(5_350_000_000);
    expect(yTicks[yTicks.length - 1]).toBeGreaterThanOrEqual(5_350_000_000);
  });

  it("picks spread X indices", () => {
    const idx = pickXAxisIndices(90, 5);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(89);
  });
});
