import { describe, expect, it } from "vitest";
import { downsampleTvlSeries, formatUsd, tvlChangePct } from "@/lib/baseAnalyticsFormat";

describe("baseAnalyticsFormat", () => {
  it("formats large USD values", () => {
    expect(formatUsd(4_521_013_401)).toBe("$4.52B");
    expect(formatUsd(120_594)).toBe("$120.6K");
  });

  it("downsamples TVL series", () => {
    const series = Array.from({ length: 200 }, (_, i) => ({ date: i, tvl: 1000 + i }));
    const out = downsampleTvlSeries(series, 10);
    expect(out.length).toBe(10);
    expect(out[0]?.tvl).toBe(1000);
    expect(out.at(-1)?.tvl).toBe(1199);
  });

  it("computes TVL change percent", () => {
    expect(tvlChangePct([{ tvl: 100 }, { tvl: 110 }])).toBe(10);
    expect(tvlChangePct([{ tvl: 100 }])).toBeNull();
  });
});
