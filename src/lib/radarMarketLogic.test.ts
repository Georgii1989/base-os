import { describe, expect, it } from "vitest";
import {
  buildSparkline,
  numberOrNull,
  parseCmcBody,
  pickBestPair,
  type DexPair,
} from "@/lib/radarMarketLogic";

describe("pickBestPair", () => {
  const token = "0xaaaa0000000000000000000000000000000000aa";

  it("picks highest Base liquidity matching base token", () => {
    const pairs: DexPair[] = [
      {
        chainId: "base",
        dexId: "low",
        baseToken: { address: token },
        liquidity: { usd: 1000 },
        priceUsd: "1",
      },
      {
        chainId: "base",
        dexId: "high",
        baseToken: { address: token },
        liquidity: { usd: 999999 },
        priceUsd: "2",
      },
      {
        chainId: "ethereum",
        dexId: "eth",
        baseToken: { address: token },
        liquidity: { usd: 1e15 },
      },
    ];

    expect(pickBestPair(pairs, token)?.dexId).toBe("high");
  });

  it("returns null when nothing on Base matches", () => {
    const pairs: DexPair[] = [
      {
        chainId: "arbitrum",
        dexId: "x",
        baseToken: { address: token },
        liquidity: { usd: 1e12 },
      },
    ];
    expect(pickBestPair(pairs, token)).toBeNull();
  });
});

describe("parseCmcBody", () => {
  it("indexes by lowercase slug", () => {
    const out = parseCmcBody({
      data: {
        "1": {
          slug: "Aave",
          quote: {
            USD: { price: 100, volume_24h: 123, percent_change_24h: 1.5 },
          },
        },
      },
    });
    expect(out.aave?.price).toBe(100);
    expect(out.aave?.volume_24h).toBe(123);
    expect(out.aave?.percent_change_24h).toBe(1.5);
  });
});

describe("numberOrNull", () => {
  it("rejects NaN-ish values", () => {
    expect(numberOrNull("x")).toBeNull();
    expect(numberOrNull(undefined)).toBeNull();
    expect(numberOrNull("12.34")).toBeCloseTo(12.34);
  });
});

describe("buildSparkline", () => {
  it("returns empty array for non-positive prices", () => {
    expect(buildSparkline(null, { h24: 1 })).toEqual([]);
    expect(buildSparkline(0, { h24: 1 })).toEqual([]);
  });

  it("returns five descending points sized by change ladder", () => {
    const values = buildSparkline(100, { h24: 10 });
    expect(values).toHaveLength(5);
    expect(values[0]).toBeCloseTo(100 / 1.1);
    expect(values[values.length - 1]).toBe(100);
  });
});
