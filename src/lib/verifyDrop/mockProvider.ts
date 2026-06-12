import { keccak256, stringToHex } from "viem";
import type { MockProfile, VerifyProviderId } from "@/lib/verifyDrop/types";

/**
 * Sandbox stand-in for the Base Verify backend.
 *
 * Real Base Verify runs OAuth against the provider and returns a deterministic
 * token per (provider account, app, action). API access is gated by an interest
 * form, so this demo derives both the token and the "account stats" from a
 * keccak hash of the linked handle — fully deterministic, so the sybil property
 * holds: the same handle always maps to the same token, whatever the wallet.
 */

const SANDBOX_SALT = "base-os-verify-drop:v1";

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function isValidHandle(raw: string): boolean {
  const handle = normalizeHandle(raw);
  return /^[a-z0-9._-]{2,32}$/.test(handle);
}

function handleHash(provider: VerifyProviderId, handle: string, scope: string): bigint {
  const digest = keccak256(
    stringToHex(`${SANDBOX_SALT}:${scope}:${provider}:${normalizeHandle(handle)}`)
  );
  return BigInt(digest);
}

/**
 * Deterministic verification token. Same provider account -> same token,
 * regardless of the connected wallet; different action -> different token.
 */
export function deriveVerificationToken(
  provider: VerifyProviderId,
  handle: string,
  action: string
): string {
  return keccak256(
    stringToHex(`${SANDBOX_SALT}:token:${action}:${provider}:${normalizeHandle(handle)}`)
  );
}

/**
 * Deterministic profile stats so the demo can exercise every API outcome:
 * ~70% of handles pass the follower thresholds, ~75% count as "verified".
 */
export function resolveMockProfile(provider: VerifyProviderId, handle: string): MockProfile {
  const normalized = normalizeHandle(handle);
  const roll = Number(handleHash(provider, normalized, "roll") % BigInt(100));
  const spread = Number(handleHash(provider, normalized, "spread") % BigInt(100_000));

  // 30% of handles land under 1000 followers to demo the 400 path.
  const followers = roll < 30 ? 80 + (spread % 900) : 1000 + spread;
  const verified = Number(handleHash(provider, normalized, "verified") % BigInt(100)) < 75;
  const subscriber = Number(handleHash(provider, normalized, "one") % BigInt(100)) < 70;

  const traits = ((): Record<string, string> => {
    switch (provider) {
      case "x":
        return { verified: String(verified), followers: String(followers) };
      case "coinbase":
        return { coinbase_one_active: String(subscriber) };
      case "instagram":
        return { followers_count: String(followers) };
      case "tiktok":
        return {
          follower_count: String(followers),
          video_count: String(spread % 400),
          likes_count: String(spread * 3),
        };
    }
  })();

  return { provider, handle: normalized, traits };
}

export function shortToken(token: string): string {
  return `${token.slice(0, 10)}…${token.slice(-6)}`;
}
