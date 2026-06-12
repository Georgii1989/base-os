import type { TraitRequirements } from "@/lib/verifyDrop/types";

/**
 * Base Verify resource URNs embedded into the SIWE message:
 *
 *   urn:verify:provider:{provider}                                — which provider to check
 *   urn:verify:provider:{provider}:{trait}:{operation}:{value}   — trait requirement
 *   urn:verify:action:{action}                                   — app action (token namespace)
 *
 * Port of the format used by base/base-verify-demo.
 */

const TRAIT_OPERATIONS = ["eq", "gt", "gte", "lt", "lte", "in"] as const;
export type TraitOperation = (typeof TRAIT_OPERATIONS)[number];

const OPERATION_PREFIX = new RegExp(`^(${TRAIT_OPERATIONS.join("|")}):(.+)$`);

/** "gte:1000" -> { operation: "gte", value: "1000" }; "true" -> { operation: "eq", value: "true" }. */
export function splitTraitRequirement(requirement: string): { operation: TraitOperation; value: string } {
  const match = requirement.match(OPERATION_PREFIX);
  if (match) return { operation: match[1] as TraitOperation, value: match[2] };
  return { operation: "eq", value: requirement };
}

/** Implicit eq normalization so "true" and "eq:true" compare as equal. */
export function normalizeTraitRequirement(requirement: string): string {
  const { operation, value } = splitTraitRequirement(requirement);
  return `${operation}:${value}`;
}

export function buildVerifyResources(
  provider: string,
  traits: TraitRequirements,
  action: string
): string[] {
  const resources = [`urn:verify:provider:${provider}`];
  for (const [trait, requirement] of Object.entries(traits)) {
    const { operation, value } = splitTraitRequirement(requirement);
    resources.push(`urn:verify:provider:${provider}:${trait}:${operation}:${value}`);
  }
  resources.push(`urn:verify:action:${action}`);
  return resources;
}

export type ParsedVerifyResources = {
  provider: string;
  traits: TraitRequirements;
  action: string | null;
};

export function parseVerifyResources(resources: readonly string[]): ParsedVerifyResources | null {
  const providerUrn = resources.find((r) => /^urn:verify:provider:[^:]+$/.test(r));
  if (!providerUrn) return null;
  const provider = providerUrn.slice("urn:verify:provider:".length);

  const traits: TraitRequirements = {};
  const traitPattern = new RegExp(`^urn:verify:provider:${provider}:([^:]+):([^:]+):(.+)$`);
  for (const resource of resources) {
    const match = resource.match(traitPattern);
    if (!match) continue;
    const [, trait, operation, value] = match;
    traits[trait] = operation === "eq" ? value : `${operation}:${value}`;
  }

  const actionUrn = resources.find((r) => r.startsWith("urn:verify:action:"));
  const action = actionUrn ? actionUrn.slice("urn:verify:action:".length) : null;

  return { provider, traits, action };
}

export type TraitValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Security-critical check from the original demo: the requirements signed by the
 * user must match the backend expectations exactly, otherwise a user could relax
 * them on the frontend (e.g. 1000 followers -> 10) and bypass access control.
 */
export function validateTraits(
  parsed: ParsedVerifyResources,
  expectedProvider: string,
  expectedTraits: TraitRequirements
): TraitValidationResult {
  if (parsed.provider !== expectedProvider) {
    return {
      valid: false,
      error: `Provider mismatch: expected '${expectedProvider}', found '${parsed.provider}'`,
    };
  }

  const expectedEntries = Object.entries(expectedTraits);
  for (const [trait, requirement] of expectedEntries) {
    const found = parsed.traits[trait];
    if (found === undefined) {
      return { valid: false, error: `Missing trait requirement '${trait}'` };
    }
    if (normalizeTraitRequirement(found) !== normalizeTraitRequirement(requirement)) {
      return {
        valid: false,
        error: `Trait '${trait}' mismatch: expected '${requirement}', found '${found}'`,
      };
    }
  }

  const extra = Object.keys(parsed.traits).filter((trait) => !(trait in expectedTraits));
  if (extra.length > 0) {
    return { valid: false, error: `Unexpected trait requirements: ${extra.join(", ")}` };
  }

  return { valid: true };
}

/** Evaluate a trait requirement against an actual profile value ("true", "12500", ...). */
export function traitSatisfied(actual: string | undefined, requirement: string): boolean {
  if (actual === undefined) return false;
  const { operation, value } = splitTraitRequirement(requirement);

  if (operation === "eq") return actual === value;
  if (operation === "in") {
    return value.split(",").map((v) => v.trim()).includes(actual);
  }

  const actualNum = Number(actual);
  const valueNum = Number(value);
  if (!Number.isFinite(actualNum) || !Number.isFinite(valueNum)) return false;

  switch (operation) {
    case "gt":
      return actualNum > valueNum;
    case "gte":
      return actualNum >= valueNum;
    case "lt":
      return actualNum < valueNum;
    case "lte":
      return actualNum <= valueNum;
  }
}

export type TraitEvaluation = {
  satisfied: boolean;
  /** Human-readable failures, e.g. "followers: need gte:1000, have 480". */
  failures: string[];
};

export function evaluateTraits(
  profileTraits: Record<string, string>,
  requirements: TraitRequirements
): TraitEvaluation {
  const failures: string[] = [];
  for (const [trait, requirement] of Object.entries(requirements)) {
    if (!traitSatisfied(profileTraits[trait], requirement)) {
      const have = profileTraits[trait] ?? "—";
      failures.push(`${trait}: need ${normalizeTraitRequirement(requirement)}, have ${have}`);
    }
  }
  return { satisfied: failures.length === 0, failures };
}
