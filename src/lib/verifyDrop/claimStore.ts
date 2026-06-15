import type { DropClaim } from "@/lib/verifyDrop/types";
import {
  memoryDeleteClaimByAddress,
  memoryFindClaimByAddress,
  memoryFindClaimByToken,
  memoryListClaims,
  memorySaveClaim,
} from "@/lib/verifyDrop/claimStoreMemory";
import {
  isKvClaimStoreEnabled,
  kvDeleteClaimByAddress,
  kvFindClaimByAddress,
  kvFindClaimByToken,
  kvListClaims,
  kvSaveClaim,
} from "@/lib/verifyDrop/claimStoreKv";

export function claimStoreMode(): "kv" | "memory" {
  return isKvClaimStoreEnabled() ? "kv" : "memory";
}

export async function findClaimByToken(token: string): Promise<DropClaim | undefined> {
  if (isKvClaimStoreEnabled()) return kvFindClaimByToken(token);
  return memoryFindClaimByToken(token);
}

export async function findClaimByAddress(address: string): Promise<DropClaim | undefined> {
  if (isKvClaimStoreEnabled()) return kvFindClaimByAddress(address);
  return memoryFindClaimByAddress(address);
}

export async function saveClaim(claim: DropClaim): Promise<void> {
  if (isKvClaimStoreEnabled()) {
    await kvSaveClaim(claim);
    return;
  }
  memorySaveClaim(claim);
}

export async function deleteClaimByAddress(address: string): Promise<DropClaim | undefined> {
  if (isKvClaimStoreEnabled()) return kvDeleteClaimByAddress(address);
  return memoryDeleteClaimByAddress(address);
}

export async function listClaims(): Promise<DropClaim[]> {
  if (isKvClaimStoreEnabled()) return kvListClaims();
  return memoryListClaims();
}
