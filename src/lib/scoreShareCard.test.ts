import { describe, expect, it } from "vitest";
import { buildScoreSharePageUrl, shortenAddress } from "@/lib/scoreShareCard";

describe("scoreShareCard", () => {
  it("shortens address for display", () => {
    expect(shortenAddress("0x2ac57AE4ac5d6BBA822A903377E655aa607Ff0A3")).toBe(
      "0x2ac5…f0A3"
    );
  });

  it("builds share page URL", () => {
    expect(
      buildScoreSharePageUrl("0xAbC", "https://app-base-os.vercel.app")
    ).toBe("https://app-base-os.vercel.app/?tab=score&address=0xAbC");
  });
});
