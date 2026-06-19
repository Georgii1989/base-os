import { describe, expect, it } from "vitest";
import {
  buildVerifyResources,
  evaluateTraits,
  normalizeTraitRequirement,
  parseVerifyResources,
  traitSatisfied,
  validateTraits,
} from "@/lib/verifyDrop/resources";

describe("buildVerifyResources", () => {
  it("builds provider, trait, and action URNs", () => {
    expect(
      buildVerifyResources("x", { verified: "true", followers: "gte:1000" }, "claim_base_os_verify")
    ).toEqual([
      "urn:verify:provider:x",
      "urn:verify:provider:x:verified:eq:true",
      "urn:verify:provider:x:followers:gte:1000",
      "urn:verify:action:claim_base_os_verify",
    ]);
  });
});

describe("parseVerifyResources", () => {
  it("round-trips what buildVerifyResources produces", () => {
    const resources = buildVerifyResources(
      "tiktok",
      { follower_count: "gte:1000" },
      "claim_base_os_verify"
    );
    expect(parseVerifyResources(resources)).toEqual({
      provider: "tiktok",
      traits: { follower_count: "gte:1000" },
      action: "claim_base_os_verify",
    });
  });

  it("returns null without a provider URN", () => {
    expect(parseVerifyResources(["urn:verify:action:claim"])).toBeNull();
  });

  it("collapses eq operation to the bare value", () => {
    const parsed = parseVerifyResources([
      "urn:verify:provider:x",
      "urn:verify:provider:x:verified:eq:true",
    ]);
    expect(parsed?.traits).toEqual({ verified: "true" });
  });
});

describe("validateTraits", () => {
  const expected = { verified: "true", followers: "gte:1000" };

  it("accepts matching requirements (implicit eq normalized)", () => {
    const parsed = parseVerifyResources(
      buildVerifyResources("x", { verified: "eq:true", followers: "gte:1000" }, "a")
    )!;
    expect(validateTraits(parsed, "x", expected).valid).toBe(true);
  });

  it("rejects relaxed requirements — the frontend-tampering attack", () => {
    const parsed = parseVerifyResources(
      buildVerifyResources("x", { verified: "true", followers: "gte:10" }, "a")
    )!;
    const result = validateTraits(parsed, "x", expected);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("followers");
  });

  it("rejects missing and extra traits and provider mismatch", () => {
    const missing = parseVerifyResources(buildVerifyResources("x", { verified: "true" }, "a"))!;
    expect(validateTraits(missing, "x", expected).valid).toBe(false);

    const extra = parseVerifyResources(
      buildVerifyResources("x", { ...expected, bonus: "eq:1" }, "a")
    )!;
    expect(validateTraits(extra, "x", expected).valid).toBe(false);

    const otherProvider = parseVerifyResources(
      buildVerifyResources("instagram", expected, "a")
    )!;
    expect(validateTraits(otherProvider, "x", expected).valid).toBe(false);
  });
});

describe("traitSatisfied / evaluateTraits", () => {
  it("supports eq, numeric comparisons, and in", () => {
    expect(traitSatisfied("true", "true")).toBe(true);
    expect(traitSatisfied("false", "true")).toBe(false);
    expect(traitSatisfied("1500", "gte:1000")).toBe(true);
    expect(traitSatisfied("999", "gte:1000")).toBe(false);
    expect(traitSatisfied("5", "lt:10")).toBe(true);
    expect(traitSatisfied("blue", "in:blue,gold")).toBe(true);
    expect(traitSatisfied(undefined, "true")).toBe(false);
  });

  it("collects readable failures", () => {
    const result = evaluateTraits(
      { verified: "false", followers: "480" },
      { verified: "true", followers: "gte:1000" }
    );
    expect(result.satisfied).toBe(false);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[1]).toContain("need gte:1000, have 480");
  });
});

describe("normalizeTraitRequirement", () => {
  it("makes the implicit eq explicit", () => {
    expect(normalizeTraitRequirement("true")).toBe("eq:true");
    expect(normalizeTraitRequirement("gte:1000")).toBe("gte:1000");
  });
});
