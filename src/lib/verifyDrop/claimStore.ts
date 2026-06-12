import type { DropClaim } from "@/lib/verifyDrop/types";

/**
 * In-memory claim store — same demo pattern as the grid646/battleship rematch
 * routes in this repo. Production would use a database with unique constraints
 * on both `address` and `token` (see base/base-verify-demo Prisma schema).
 */
const claimsByToken = new Map<string, DropClaim>();
const claimsByAddress = new Map<string, DropClaim>();

function addressKey(address: string): string {
  return address.toLowerCase();
}

export function findClaimByToken(token: string): DropClaim | undefined {
  return claimsByToken.get(token);
}

export function findClaimByAddress(address: string): DropClaim | undefined {
  return claimsByAddress.get(addressKey(address));
}

export function saveClaim(claim: DropClaim): void {
  claimsByToken.set(claim.token, claim);
  claimsByAddress.set(addressKey(claim.address), claim);
}

export function deleteClaimByAddress(address: string): DropClaim | undefined {
  const claim = claimsByAddress.get(addressKey(address));
  if (!claim) return undefined;
  claimsByAddress.delete(addressKey(address));
  claimsByToken.delete(claim.token);
  return claim;
}

export function listClaims(): DropClaim[] {
  return Array.from(claimsByToken.values()).sort((a, b) => b.claimedAt - a.claimedAt);
}
