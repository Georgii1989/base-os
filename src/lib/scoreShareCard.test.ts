import { describe, expect, it } from "vitest";
import {
  buildScoreSharePageUrl,
  buildScoreTweetText,
  buildTwitterIntentUrl,
  shortenAddress,
  type ScoreShareCardInput,
} from "@/lib/scoreShareCard";

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

  it("builds Twitter intent with score and link", () => {
    const input: ScoreShareCardInput = {
      address: "0xabc",
      score: 96,
      grade: "A",
      outgoingTxs: 400,
      uniqueContractsTouched: 134,
      activeDays: 149,
      bridgeTxs: 8,
      deployments: 17,
      firstActivityAt: null,
      isContract: false,
    };
    const url = buildScoreSharePageUrl("0xabc", "https://app-base-os.vercel.app");
    const tweet = buildScoreTweetText(input, url);
    expect(tweet).toContain("96");
    expect(tweet).toContain("Grade A");
    expect(tweet).toContain(url);
    expect(buildTwitterIntentUrl(tweet)).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
  });
});
