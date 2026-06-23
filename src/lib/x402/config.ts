import { isAddress } from "viem";

/** Base mainnet (CAIP-2). */
export const X402_BASE_MAINNET = "eip155:8453" as const;

const BUILDER_CODE_PATTERN = /^[a-z0-9_]{1,32}$/;

export function resolveX402BuilderCode(): string | null {
  const raw = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE?.trim() || "bc_59omft8w";
  return BUILDER_CODE_PATTERN.test(raw) ? raw : null;
}

export function resolveX402PayTo(): `0x${string}` | null {
  const raw = process.env.X402_PAY_TO_ADDRESS?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw;
}

export function resolveX402ScorePrice(): string {
  const raw = process.env.X402_SCORE_PRICE?.trim() || "$0.001";
  if (raw.startsWith("$")) return raw;
  if (/^\d/.test(raw) || raw.startsWith(".")) {
    const amount = raw.startsWith(".") ? `0${raw}` : raw;
    return `$${amount}`;
  }
  return raw;
}

export function hasX402CdpCredentials(): boolean {
  return Boolean(process.env.CDP_API_KEY_ID?.trim() && process.env.CDP_API_KEY_SECRET?.trim());
}

/** Seller settlement needs CDP verify/settle + a payout address. */
export function isX402SellerConfigured(): boolean {
  return hasX402CdpCredentials() && resolveX402PayTo() !== null && resolveX402BuilderCode() !== null;
}

export function x402PublicStatus() {
  const builderCode = resolveX402BuilderCode();
  const payTo = resolveX402PayTo();
  return {
    network: X402_BASE_MAINNET,
    builderCode,
    payTo,
    scorePrice: resolveX402ScorePrice(),
    sellerConfigured: isX402SellerConfigured(),
    cdpCredentials: hasX402CdpCredentials(),
  };
}
