import { getAddress, isAddress } from "viem";

const BLOCKSCOUT_BASE = "https://base.blockscout.com/api/v2";

export type BadgeHolderRecord = {
  address: `0x${string}`;
  tokenId: string;
  mintTxHash: `0x${string}` | null;
  blockNumber: string | null;
};

type BlockscoutAddressRef = { hash?: string };

type BlockscoutInstance = {
  id?: string;
  owner?: BlockscoutAddressRef;
};

type BlockscoutInstancesPage = {
  items?: BlockscoutInstance[];
  next_page_params?: Record<string, unknown> | null;
};

function blockscoutHeaders(): HeadersInit {
  const key = process.env.BLOCKSCOUT_API_KEY?.trim();
  return key ? { accept: "application/json", "x-api-key": key } : { accept: "application/json" };
}

async function blockscoutGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BLOCKSCOUT_BASE}${path}`, {
    headers: blockscoutHeaders(),
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`blockscout_${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchAllInstances(tokenAddress: string): Promise<BlockscoutInstance[]> {
  const first = await blockscoutGet<BlockscoutInstancesPage>(`/tokens/${tokenAddress}/instances`);
  const items: BlockscoutInstance[] = [...(first.items ?? [])];
  const next = first.next_page_params as Record<string, string> | null | undefined;
  if (!next) return items;

  const qs = new URLSearchParams(next).toString();
  if (!qs) return items;

  const second = await blockscoutGet<BlockscoutInstancesPage>(
    `/tokens/${tokenAddress}/instances?${qs}`
  );
  items.push(...(second.items ?? []));
  return items;
}

/** Badge holder registry via Blockscout — avoids brittle client-side eth_getLogs over long ranges. */
export async function fetchBadgeHolders(rawTokenAddress: string): Promise<BadgeHolderRecord[]> {
  if (!isAddress(rawTokenAddress)) {
    throw new Error("invalid_sbt_address");
  }
  const tokenAddress = getAddress(rawTokenAddress);
  const instances = await fetchAllInstances(tokenAddress);

  const byOwner = new Map<string, BadgeHolderRecord>();

  for (const inst of instances) {
    const tokenId = inst.id?.trim();
    const ownerRaw = inst.owner?.hash;
    if (!tokenId || !ownerRaw || !isAddress(ownerRaw)) continue;

    const address = getAddress(ownerRaw);
    const record: BadgeHolderRecord = {
      address,
      tokenId,
      mintTxHash: null,
      blockNumber: null,
    };
    const key = address.toLowerCase();
    const existing = byOwner.get(key);
    if (!existing || BigInt(tokenId) > BigInt(existing.tokenId)) {
      byOwner.set(key, record);
    }
  }

  return Array.from(byOwner.values()).sort((a, b) => {
    const aId = BigInt(a.tokenId);
    const bId = BigInt(b.tokenId);
    if (aId === bId) return a.address.localeCompare(b.address);
    return aId > bId ? -1 : 1;
  });
}
