import type { DropClaim } from "@/lib/verifyDrop/types";

const CLAIMS_KEY = "base-os:verify-drop:claims";
const TOKEN_PREFIX = "base-os:verify-drop:token:";
const ADDRESS_PREFIX = "base-os:verify-drop:address:";

type KvConfig = { url: string; token: string };

function kvConfig(): KvConfig | null {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.VERIFY_DROP_KV_REST_API_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.VERIFY_DROP_KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isKvClaimStoreEnabled(): boolean {
  return kvConfig() != null;
}

async function redis<T>(command: (string | number)[]): Promise<T> {
  const cfg = kvConfig();
  if (!cfg) throw new Error("kv_not_configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`kv_error_${res.status}`);
  }
  const body = (await res.json()) as { result?: T };
  return body.result as T;
}

async function readAllClaims(): Promise<DropClaim[]> {
  const raw = await redis<string | null>(["GET", CLAIMS_KEY]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DropClaim[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllClaims(claims: DropClaim[]): Promise<void> {
  await redis(["SET", CLAIMS_KEY, JSON.stringify(claims)]);
}

export async function kvFindClaimByToken(token: string): Promise<DropClaim | undefined> {
  const address = await redis<string | null>(["GET", `${TOKEN_PREFIX}${token}`]);
  if (!address) return undefined;
  const raw = await redis<string | null>(["GET", `${ADDRESS_PREFIX}${address}`]);
  if (!raw) return undefined;
  return JSON.parse(raw) as DropClaim;
}

export async function kvFindClaimByAddress(address: string): Promise<DropClaim | undefined> {
  const raw = await redis<string | null>(["GET", `${ADDRESS_PREFIX}${address.toLowerCase()}`]);
  if (!raw) return undefined;
  return JSON.parse(raw) as DropClaim;
}

export async function kvSaveClaim(claim: DropClaim): Promise<void> {
  const addrKey = claim.address.toLowerCase();
  await redis(["SET", `${ADDRESS_PREFIX}${addrKey}`, JSON.stringify(claim)]);
  await redis(["SET", `${TOKEN_PREFIX}${claim.token}`, addrKey]);
  const all = await readAllClaims();
  const next = [claim, ...all.filter((c) => c.token !== claim.token)];
  await writeAllClaims(next.slice(0, 500));
}

export async function kvDeleteClaimByAddress(address: string): Promise<DropClaim | undefined> {
  const claim = await kvFindClaimByAddress(address);
  if (!claim) return undefined;
  const addrKey = address.toLowerCase();
  await redis(["DEL", `${ADDRESS_PREFIX}${addrKey}`]);
  await redis(["DEL", `${TOKEN_PREFIX}${claim.token}`]);
  const all = await readAllClaims();
  await writeAllClaims(all.filter((c) => c.token !== claim.token));
  return claim;
}

export async function kvListClaims(): Promise<DropClaim[]> {
  return readAllClaims();
}
