import type { BaseAnalyticsPayload, OnchainStats } from "@/lib/baseAnalyticsTypes";
import { getAnalyticsSourceMeta } from "@/lib/analyticsSources";
import { emptyAnalyticsPayload } from "@/lib/analytics/emptyPayload";
import { fetchDefiLlamaJson } from "@/lib/fetchDefiLlama";

type BlockscoutStats = {
  transactions_today?: string | number;
  total_transactions?: string | number;
  total_addresses?: string | number;
  total_blocks?: string | number;
  gas_prices?: { slow?: number; average?: number; fast?: number };
  network_utilization_percentage?: number;
  coin_price?: string | number;
  coin_price_change_percentage?: number;
  average_block_time?: number;
};

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchBlockscoutAnalytics(): Promise<BaseAnalyticsPayload> {
  const meta = getAnalyticsSourceMeta("blockscout");
  const base = emptyAnalyticsPayload("blockscout");
  const errors: string[] = [];

  const [statsRaw, chainsRaw] = await Promise.all([
    fetchDefiLlamaJson<BlockscoutStats>("https://base.blockscout.com/api/v2/stats", 120, 25_000),
    fetchDefiLlamaJson<{ name: string; tvl: number }[]>("https://api.llama.fi/v2/chains", 300, 20_000),
  ]);

  if (!statsRaw) errors.push("blockscout_stats");

  const baseTvl = chainsRaw?.find((c) => c.name === "Base")?.tvl ?? null;

  let onchain: OnchainStats | null = null;
  if (statsRaw) {
    const gas = statsRaw.gas_prices ?? {};
    onchain = {
      transactionsToday: toNumber(statsRaw.transactions_today) ?? 0,
      totalTransactions: toNumber(statsRaw.total_transactions) ?? 0,
      totalAddresses: toNumber(statsRaw.total_addresses) ?? 0,
      totalBlocks: toNumber(statsRaw.total_blocks) ?? 0,
      gasGwei: {
        slow: gas.slow ?? 0,
        average: gas.average ?? 0,
        fast: gas.fast ?? 0,
      },
      networkUtilizationPct: statsRaw.network_utilization_percentage ?? 0,
      ethPriceUsd: toNumber(statsRaw.coin_price),
      ethPriceChange24hPct: statsRaw.coin_price_change_percentage ?? null,
      averageBlockTimeMs: statsRaw.average_block_time ?? null,
    };
  }

  return {
    ...base,
    updatedAt: new Date().toISOString(),
    sourceLabel: meta.label,
    sourceHref: meta.href,
    sourceDescription: meta.description,
    chain: {
      name: "Base",
      chainId: 8453,
      tvlUsd: baseTvl,
      rank: null,
      totalChains: null,
    },
    onchain,
    errors,
  };
}
