import { describe, expect, it } from "vitest";
import {
  deriveVerificationToken,
  isValidHandle,
  normalizeHandle,
  resolveMockProfile,
} from "@/lib/verifyDrop/mockProvider";

describe("normalizeHandle / isValidHandle", () => {
  it("strips @, trims, lowercases", () => {
    expect(normalizeHandle("  @JessePollak ")).toBe("jessepollak");
  });

  it("validates the allowed charset and length", () => {
    expect(isValidHandle("@base_builder.1")).toBe(true);
    expect(isValidHandle("a")).toBe(false);
    expect(isValidHandle("has spaces")).toBe(false);
    expect(isValidHandle("x".repeat(33))).toBe(false);
  });
});

describe("deriveVerificationToken — the sybil-resistance core", () => {
  it("is deterministic: same account, same token, any wallet", () => {
    const a = deriveVerificationToken("x", "@JessePollak", "claim_base_os_drop");
    const b = deriveVerificationToken("x", "jessepollak", "claim_base_os_drop");
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("differs per provider, per account, and per action", () => {
    const base = deriveVerificationToken("x", "jesse", "claim_base_os_drop");
    expect(deriveVerificationToken("instagram", "jesse", "claim_base_os_drop")).not.toBe(base);
    expect(deriveVerificationToken("x", "notjesse", "claim_base_os_drop")).not.toBe(base);
    expect(deriveVerificationToken("x", "jesse", "join_allowlist")).not.toBe(base);
  });
});

describe("resolveMockProfile", () => {
  it("is deterministic and exposes provider-specific trait names", () => {
    const first = resolveMockProfile("x", "@Builder");
    const second = resolveMockProfile("x", "builder");
    expect(first).toEqual(second);
    expect(Object.keys(first.traits)).toEqual(["verified", "followers"]);

    expect(Object.keys(resolveMockProfile("coinbase", "builder").traits)).toEqual([
      "coinbase_one_active",
    ]);
    expect(Object.keys(resolveMockProfile("instagram", "builder").traits)).toEqual([
      "followers_count",
    ]);
    expect(Object.keys(resolveMockProfile("tiktok", "builder").traits)).toEqual([
      "follower_count",
      "video_count",
      "likes_count",
    ]);
  });

  it("produces both passing and failing follower counts across handles", () => {
    let pass = 0;
    let fail = 0;
    for (let i = 0; i < 200; i++) {
      const profile = resolveMockProfile("x", `handle${i}`);
      if (Number(profile.traits.followers) >= 1000) pass += 1;
      else fail += 1;
    }
    expect(pass).toBeGreaterThan(0);
    expect(fail).toBeGreaterThan(0);
  });
});
