import { describe, expect, it, vi } from "vitest";
import { buildOsDeepLinkMetadata } from "@/lib/osDeepLinkMetadata";

vi.mock("@/lib/onchainScoreFetch", () => ({
  fetchOnchainScore: vi.fn(async () => ({
    address: "0x8655520b4b19187038aC9a4f560da0979Cc1E95C",
    score: {
      score: 100,
      grade: "A",
      metrics: { deployments: 17, activeDays: 42 },
    },
  })),
}));

describe("buildOsDeepLinkMetadata", () => {
  it("returns score-specific title when tab and address are set", async () => {
    const meta = await buildOsDeepLinkMetadata(
      "score",
      "0x8655520b4b19187038aC9a4f560da0979Cc1E95C"
    );
    expect(String(meta.title)).toContain("Onchain score");
    expect(String(meta.title)).toContain("Grade A");
    expect(meta.openGraph?.images).toBeDefined();
  });

  it("returns portfolio title for portfolio tab", async () => {
    const meta = await buildOsDeepLinkMetadata(
      "portfolio",
      "0x8655520b4b19187038aC9a4f560da0979Cc1E95C"
    );
    expect(String(meta.title)).toContain("portfolio");
  });

  it("returns game invite metadata for room deep link", async () => {
    const meta = await buildOsDeepLinkMetadata("game", null, "42");
    expect(String(meta.title)).toContain("Room #42");
    expect(meta.openGraph?.images).toBeDefined();
  });

  it("returns default metadata without address", async () => {
    const meta = await buildOsDeepLinkMetadata("score", null);
    expect(String(meta.title)).toContain("Base OS");
  });
});
