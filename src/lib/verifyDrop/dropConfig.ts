import type { TraitRequirements, VerifyProviderId } from "@/lib/verifyDrop/types";

/**
 * Drop configuration — the server-side source of truth.
 * Modeled after base/base-verify-demo: trait requirements live on the backend
 * and the SIWE message from the client must match them exactly.
 */
export const DROP_ACTION = "claim_base_os_verify";

export const DROP_STATEMENT = "Claim via Base Verify";

export const DROP_AMOUNT_LABEL = "1,000 OS points";

export type DropProviderConfig = {
  id: VerifyProviderId;
  label: string;
  /** What the user links in the sandbox OAuth step. */
  accountNoun: string;
  /** Trait requirements in Base Verify URN value format. */
  requirements: TraitRequirements;
};

/** Trait names follow the Base Verify trait catalog (per-provider naming). */
export const DROP_PROVIDERS: readonly DropProviderConfig[] = [
  {
    id: "x",
    label: "X (Twitter)",
    accountNoun: "X handle",
    requirements: { verified: "true", followers: "gte:1000" },
  },
  {
    id: "coinbase",
    label: "Coinbase",
    accountNoun: "Coinbase account",
    requirements: { coinbase_one_active: "true" },
  },
  {
    id: "instagram",
    label: "Instagram",
    accountNoun: "Instagram username",
    requirements: { followers_count: "gte:1000" },
  },
  {
    id: "tiktok",
    label: "TikTok",
    accountNoun: "TikTok username",
    requirements: { follower_count: "gte:1000" },
  },
] as const;

/** Plain message signed to delete one's own claim. */
export function deleteClaimMessage(address: string): string {
  return `Delete Base Verify claim for ${address}`;
}

export function dropProviderConfig(id: string): DropProviderConfig | undefined {
  return DROP_PROVIDERS.find((p) => p.id === id);
}

export function isVerifyProviderId(value: string): value is VerifyProviderId {
  return DROP_PROVIDERS.some((p) => p.id === value);
}
