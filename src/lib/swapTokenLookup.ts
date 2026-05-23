import { readFileSync } from "fs";
import path from "path";
import { createPublicClient, http, getAddress } from "viem";
import { base } from "viem/chains";
import { BASE_TOP_SWAP_TOKENS } from "@/lib/swapBaseTokens";
import { findSwapPreset } from "@/lib/swapTokens";
import { swapTokenLogo } from "@/lib/swapTokenLogos";
import type { SwapTokenPreset } from "@/lib/swapBaseTokens";

const ERC20_ABI = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

type CgEntry = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

type LookupToken = SwapTokenPreset & { logoURI?: string | null; priceUsd?: number | null };

let cgByAddress: Map<string, CgEntry> | null = null;
let cgBySymbol: Map<string, CgEntry[]> | null = null;

function loadCgIndex() {
  if (cgByAddress) return;
  cgByAddress = new Map();
  cgBySymbol = new Map();
  try {
    const file = path.join(process.cwd(), "scripts/cg-base-tokens.json");
    const json = JSON.parse(readFileSync(file, "utf8")) as {
      tokens?: Array<{
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
        chainId?: number;
      }>;
    };
    for (const t of json.tokens ?? []) {
      if (t.chainId != null && t.chainId !== 8453) continue;
      const entry: CgEntry = {
        address: getAddress(t.address),
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: t.logoURI,
      };
      cgByAddress.set(entry.address.toLowerCase(), entry);
      const sym = entry.symbol.toUpperCase();
      const list = cgBySymbol.get(sym) ?? [];
      list.push(entry);
      cgBySymbol.set(sym, list);
    }
  } catch {
    cgByAddress = new Map();
    cgBySymbol = new Map();
  }
}

function fromPreset(token: SwapTokenPreset): LookupToken {
  return { ...token, logoURI: swapTokenLogo(token.address) ?? null };
}

function fromCg(entry: CgEntry): LookupToken {
  const known = findSwapPreset(entry.address);
  if (known) return fromPreset(known);
  return {
    id: "custom",
    symbol: entry.symbol,
    name: entry.name,
    address: entry.address as `0x${string}`,
    decimals: entry.decimals,
    logoURI: entry.logoURI ?? swapTokenLogo(entry.address) ?? null,
  };
}

async function fromChain(address: `0x${string}`): Promise<LookupToken | null> {
  const client = createPublicClient({
    chain: base,
    transport: http(),
  });
  try {
    const [symbol, decimals, name] = await Promise.all([
      client.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "decimals" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "name" }).catch(() => ""),
    ]);
    if (typeof symbol !== "string" || typeof decimals !== "number") return null;
    const known = findSwapPreset(address);
    if (known) return fromPreset(known);
    return {
      id: "custom",
      symbol,
      name: typeof name === "string" && name ? name : symbol,
      address,
      decimals: Number(decimals),
      logoURI: swapTokenLogo(address) ?? null,
    };
  } catch {
    return null;
  }
}

async function attachPrices(tokens: LookupToken[]): Promise<LookupToken[]> {
  if (tokens.length === 0) return tokens;
  const keys = tokens.map((t) =>
    isNativeEthToken(t.address) ? "coingecko:ethereum" : `base:${t.address}`
  );
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${keys.join(",")}`);
    if (!res.ok) return tokens;
    const json = (await res.json()) as { coins?: Record<string, { price?: number }> };
    return tokens.map((t) => {
      const key = isNativeEthToken(t.address) ? "coingecko:ethereum" : `base:${t.address}`;
      const p = json.coins?.[key]?.price;
      return typeof p === "number" ? { ...t, priceUsd: p } : t;
    });
  } catch {
    return tokens;
  }
}

function isNativeEthToken(address: string): boolean {
  return address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}

export function normalizeAddressQuery(q: string): `0x${string}` | null {
  const trimmed = q.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  try {
    return getAddress(trimmed) as `0x${string}`;
  } catch {
    return null;
  }
}

export async function lookupSwapTokenByAddress(address: `0x${string}`): Promise<LookupToken | null> {
  const known = findSwapPreset(address);
  if (known) {
    const [withPrice] = await attachPrices([fromPreset(known)]);
    return withPrice ?? null;
  }

  loadCgIndex();
  const cg = cgByAddress!.get(address.toLowerCase());
  if (cg) {
    const [withPrice] = await attachPrices([fromCg(cg)]);
    return withPrice ?? null;
  }

  const chain = await fromChain(address);
  if (!chain) return null;
  const [withPrice] = await attachPrices([chain]);
  return withPrice ?? null;
}

export async function searchSwapTokens(query: string, limit = 12): Promise<LookupToken[]> {
  const q = query.trim();
  if (!q) return [];

  const addr = normalizeAddressQuery(q);
  if (addr) {
    const one = await lookupSwapTokenByAddress(addr);
    return one ? [one] : [];
  }

  const lower = q.toLowerCase();
  const fromPresets = BASE_TOP_SWAP_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(lower) ||
      t.name.toLowerCase().includes(lower) ||
      t.address.toLowerCase().includes(lower)
  ).map(fromPreset);

  loadCgIndex();
  const cgHits: LookupToken[] = [];
  const exactSym = cgBySymbol!.get(q.toUpperCase()) ?? [];
  for (const entry of exactSym) {
    cgHits.push(fromCg(entry));
  }
  if (cgHits.length === 0) {
    for (const entry of cgByAddress!.values()) {
      if (
        entry.symbol.toLowerCase().includes(lower) ||
        entry.name.toLowerCase().includes(lower) ||
        entry.address.toLowerCase().includes(lower)
      ) {
        cgHits.push(fromCg(entry));
        if (cgHits.length >= limit) break;
      }
    }
  }

  const seen = new Set<string>();
  const merged: LookupToken[] = [];
  for (const t of [...fromPresets, ...cgHits]) {
    const key = t.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(t);
    if (merged.length >= limit) break;
  }
  return attachPrices(merged);
}

export type { LookupToken };
