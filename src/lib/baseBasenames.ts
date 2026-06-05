import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  toCoinType,
  type Address,
} from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";
import { BASE_CHAIN_ID } from "@/lib/baseChain";

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_ETH_MAINNET_RPC_URL?.trim() ||
  "https://ethereum-rpc.publicnode.com";

let ensClient: ReturnType<typeof createPublicClient> | null = null;

function getEnsClient() {
  if (!ensClient) {
    ensClient = createPublicClient({
      chain: mainnet,
      transport: http(MAINNET_RPC),
    });
  }
  return ensClient;
}

/** Human-readable Base name (ENSIP-19), e.g. `alice.base.eth`. */
export function isBasenameLike(input: string): boolean {
  const t = input.trim().toLowerCase();
  return t.endsWith(".base.eth") || t.endsWith(".bas.eth");
}

export async function resolveBasenameToAddress(name: string): Promise<Address | null> {
  const trimmed = name.trim();
  if (!isBasenameLike(trimmed)) return null;
  try {
    const client = getEnsClient();
    const addr = await client.getEnsAddress({
      name: normalize(trimmed),
      coinType: toCoinType(BASE_CHAIN_ID),
    });
    return addr ?? null;
  } catch {
    return null;
  }
}

export async function resolveAddressToBasename(address: Address): Promise<string | null> {
  try {
    const client = getEnsClient();
    const name = await client.getEnsName({
      address,
      coinType: toCoinType(BASE_CHAIN_ID),
    });
    return name ?? null;
  } catch {
    return null;
  }
}

/** Accept `0x…` or `*.base.eth` / `*.bas.eth`. */
export async function resolveAddressInput(raw: string): Promise<`0x${string}` | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isAddress(trimmed)) return getAddress(trimmed);
  const resolved = await resolveBasenameToAddress(trimmed);
  return resolved ? getAddress(resolved) : null;
}
