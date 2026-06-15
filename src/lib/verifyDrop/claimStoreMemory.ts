import type { DropClaim } from "@/lib/verifyDrop/types";

const claimsByToken = new Map<string, DropClaim>();
const claimsByAddress = new Map<string, DropClaim>();

function addressKey(address: string): string {
  return address.toLowerCase();
}

export function memoryFindClaimByToken(token: string): DropClaim | undefined {
  return claimsByToken.get(token);
}

export function memoryFindClaimByAddress(address: string): DropClaim | undefined {
  return claimsByAddress.get(addressKey(address));
}

export function memorySaveClaim(claim: DropClaim): void {
  claimsByToken.set(claim.token, claim);
  claimsByAddress.set(addressKey(claim.address), claim);
}

export function memoryDeleteClaimByAddress(address: string): DropClaim | undefined {
  const claim = claimsByAddress.get(addressKey(address));
  if (!claim) return undefined;
  claimsByAddress.delete(addressKey(address));
  claimsByToken.delete(claim.token);
  return claim;
}

export function memoryListClaims(): DropClaim[] {
  return Array.from(claimsByToken.values()).sort((a, b) => b.claimedAt - a.claimedAt);
}
