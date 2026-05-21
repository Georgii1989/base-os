import { describe, expect, it } from "vitest";
import { parseAnalyticsSource } from "@/lib/analyticsSources";

describe("parseAnalyticsSource", () => {
  it("defaults to defillama", () => {
    expect(parseAnalyticsSource(null)).toBe("defillama");
    expect(parseAnalyticsSource("")).toBe("defillama");
  });

  it("parses known sources", () => {
    expect(parseAnalyticsSource("l2beat")).toBe("l2beat");
    expect(parseAnalyticsSource("BLOCKSCOUT")).toBe("blockscout");
  });

  it("rejects unknown values", () => {
    expect(parseAnalyticsSource("coingecko")).toBe("defillama");
  });
});
