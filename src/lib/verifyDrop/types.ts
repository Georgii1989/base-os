export type VerifyProviderId = "x" | "coinbase" | "instagram" | "tiktok";

/** Trait requirement map, e.g. { verified: "true", followers: "gte:1000" }. */
export type TraitRequirements = Record<string, string>;

/** Simulated provider profile resolved by the sandbox verifier. */
export type MockProfile = {
  provider: VerifyProviderId;
  handle: string;
  /** Numeric/boolean traits as strings, keyed by provider trait name. */
  traits: Record<string, string>;
};

export type DropClaim = {
  address: `0x${string}`;
  provider: VerifyProviderId;
  /** Deterministic verification token — the anti-sybil key. */
  token: string;
  /** Display handle in mock mode (never stored by real Base Verify). */
  handle: string | null;
  claimedAt: number;
};

export type DropConfigPayload = {
  mode: "sandbox" | "live";
  action: string;
  amountLabel: string;
  providers: Array<{
    id: VerifyProviderId;
    label: string;
    accountNoun: string;
    requirements: TraitRequirements;
  }>;
};

export type ClaimsPayload = DropConfigPayload & {
  claims: DropClaim[];
  storage?: "kv" | "memory";
};

export type ClaimErrorCode =
  | "bad_request"
  | "invalid_signature"
  | "invalid_traits"
  | "not_verified"
  | "verification_traits_not_satisfied"
  | "token_already_used"
  | "address_already_claimed"
  | "upstream_error";

export type ClaimErrorPayload = {
  error: ClaimErrorCode;
  message: string;
  /** For token_already_used: wallet that holds the claim. */
  claimedBy?: string;
  failures?: string[];
};

export type ClaimSuccessPayload = {
  success: true;
  claim: DropClaim;
};
