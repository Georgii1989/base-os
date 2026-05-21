import { fetchDefiLlamaJson } from "@/lib/fetchDefiLlama";

type LlamaProtocolDetail = {
  chainTvls?: Record<string, number | unknown[] | { tvl?: number }>;
};

type DexChainBreakdown = {
  total24h?: number;
  total7d?: number;
  total30d?: number;
  change_1d?: number;
};

type LlamaDexSummary = {
  chainBreakdown?: Record<string, DexChainBreakdown>;
};

type LlamaDexOverview = {
  total24h?: number;
  total7d?: number;
  total30d?: number;
  change_1d?: number;
};

export function parseBaseTvlFromProtocol(detail: LlamaProtocolDetail | null): number | null {
  if (!detail) return null;
  const base = detail.chainTvls?.Base;
  if (typeof base === "number") return base;
  if (Array.isArray(base)) {
    const last = base[base.length - 1];
    if (Array.isArray(last) && typeof last[1] === "number") return last[1];
    if (typeof last === "number") return last;
  }
  if (base && typeof base === "object" && !Array.isArray(base)) {
    const obj = base as { tvl?: number };
    if (typeof obj.tvl === "number") return obj.tvl;
  }
  return null;
}

export function parseBaseDexFromSummary(summary: LlamaDexSummary | null): DexChainBreakdown | null {
  const base = summary?.chainBreakdown?.Base;
  if (!base || typeof base.total24h !== "number") return null;
  return base;
}

export async function fetchProtocolBaseTvl(slug: string): Promise<number | null> {
  const detail = await fetchDefiLlamaJson<LlamaProtocolDetail>(
    `https://api.llama.fi/protocol/${slug}`,
    600,
    20_000
  );
  return parseBaseTvlFromProtocol(detail);
}

export async function fetchDexBaseVolume(slug: string): Promise<DexChainBreakdown | null> {
  const summary = await fetchDefiLlamaJson<LlamaDexSummary>(
    `https://api.llama.fi/summary/dexs/${slug}`,
    600,
    20_000
  );
  return parseBaseDexFromSummary(summary);
}

/** Chain-level DEX totals from DeFi Llama overview (optional; large payload). */
export async function fetchBaseDexOverview(): Promise<LlamaDexOverview | null> {
  return fetchDefiLlamaJson<LlamaDexOverview>(
    "https://api.llama.fi/overview/dexs/Base?excludeTotalDataChart=true",
    300,
    50_000
  );
}
