import {
  fetchBaseDexOverview,
  fetchDexBaseVolume,
  fetchProtocolBaseTvl,
} from "@/lib/baseAnalyticsLlama";
import { downsampleTvlSeries, tvlChangePct } from "@/lib/baseAnalyticsFormat";
import { BASE_ANALYTICS_PROTOCOLS } from "@/lib/baseAnalyticsProtocols";
import type {
  BaseAnalyticsPayload,
  ChainRankRow,
  DexVolumeRow,
  ProtocolTvlRow,
  TvlPoint,
} from "@/lib/baseAnalyticsTypes";
import { getAnalyticsSourceMeta } from "@/lib/analyticsSources";
import { fetchDefiLlamaJson } from "@/lib/fetchDefiLlama";
import { emptyAnalyticsPayload } from "@/lib/analytics/emptyPayload";

type LlamaChain = { name: string; tvl: number; chainId?: number };
type LlamaFeesSummary = {
  total24h?: number;
  total7d?: number;
  total30d?: number;
  totalAllTime?: number;
  change_1d?: number;
};
type StablecoinChain = {
  name: string;
  totalCirculatingUSD?: Record<string, number>;
};

const STABLE_LABELS: Record<string, string> = {
  peggedUSD: "USD",
  peggedEUR: "EUR",
  peggedGBP: "GBP",
};

function parseStablecoinCirculating(row: StablecoinChain | undefined) {
  if (!row?.totalCirculatingUSD) return null;
  const breakdown = Object.entries(row.totalCirculatingUSD)
    .filter(([, usd]) => typeof usd === "number" && usd > 0)
    .map(([key, usd]) => ({
      label: STABLE_LABELS[key] ?? key.replace(/^pegged/, ""),
      usd: usd as number,
    }))
    .sort((a, b) => b.usd - a.usd);

  const circulatingUsd = breakdown.reduce((sum, row) => sum + row.usd, 0);
  return { circulatingUsd, breakdown: breakdown.slice(0, 6) };
}

function buildDexVolumePayload(
  overview: Awaited<ReturnType<typeof fetchBaseDexOverview>>,
  dexRows: DexVolumeRow[]
): BaseAnalyticsPayload["dexVolume"] {
  if (overview?.total24h != null) {
    return {
      total24h: overview.total24h,
      total7d: overview.total7d ?? 0,
      total30d: overview.total30d ?? 0,
      change1dPct: overview.change_1d ?? null,
      source: "overview",
      byProtocol: dexRows,
    };
  }

  if (dexRows.length === 0) return null;

  const total24h = dexRows.reduce((s, r) => s + r.volume24h, 0);
  const total7d = dexRows.reduce((s, r) => s + r.volume7d, 0);
  const total30d = dexRows.reduce((s, r) => s + r.volume30d, 0);
  const leader = dexRows[0];

  return {
    total24h,
    total7d,
    total30d,
    change1dPct: leader?.change1dPct ?? null,
    source: "aggregated",
    byProtocol: dexRows,
  };
}

export async function fetchDefillamaAnalytics(): Promise<BaseAnalyticsPayload> {
  const meta = getAnalyticsSourceMeta("defillama");
  const base = emptyAnalyticsPayload("defillama");
  const errors: string[] = [];

  const dexMetas = BASE_ANALYTICS_PROTOCOLS.filter((p) => p.category === "DEX");

  const [chainsRaw, historyRaw, stableRaw, feesRaw, dexOverview, ...protocolResults] =
    await Promise.all([
      fetchDefiLlamaJson<LlamaChain[]>("https://api.llama.fi/v2/chains"),
      fetchDefiLlamaJson<TvlPoint[]>("https://api.llama.fi/v2/historicalChainTvl/Base"),
      fetchDefiLlamaJson<StablecoinChain[]>("https://stablecoins.llama.fi/stablecoinchains"),
      fetchDefiLlamaJson<LlamaFeesSummary>("https://api.llama.fi/summary/fees/base"),
      fetchBaseDexOverview(),
      ...BASE_ANALYTICS_PROTOCOLS.map(async (protocolMeta) => {
        const [tvlUsd, dexBase] = await Promise.all([
          fetchProtocolBaseTvl(protocolMeta.slug),
          protocolMeta.category === "DEX" ? fetchDexBaseVolume(protocolMeta.slug) : Promise.resolve(null),
        ]);
        return { meta: protocolMeta, tvlUsd, dexBase };
      }),
    ]);

  if (!chainsRaw) errors.push("chain_tvl");
  if (!historyRaw) errors.push("tvl_history");
  if (!stableRaw) errors.push("stablecoins");
  if (!feesRaw) errors.push("fees");
  if (!dexOverview) errors.push("dex_overview");

  const sortedChains = [...(chainsRaw ?? [])].sort((a, b) => b.tvl - a.tvl);
  const baseChain = sortedChains.find((c) => c.name === "Base");
  const baseRank = baseChain ? sortedChains.indexOf(baseChain) + 1 : 0;

  const historyFull = historyRaw ?? [];
  const history30 = historyFull.slice(-30);
  const tvlHistory = downsampleTvlSeries(historyFull, 90);

  const chainRanks: ChainRankRow[] = sortedChains.slice(0, 12).map((chain, index) => ({
    name: chain.name,
    tvl: chain.tvl,
    rank: index + 1,
    isBase: chain.name === "Base",
  }));

  const protocols: ProtocolTvlRow[] = protocolResults
    .map(({ meta: protocolMeta, tvlUsd }) => ({
      slug: protocolMeta.slug,
      name: protocolMeta.name,
      category: protocolMeta.category,
      tvlUsd,
      defillamaUrl: `https://defillama.com/protocol/${protocolMeta.slug}`,
    }))
    .filter((row) => row.tvlUsd !== null && row.tvlUsd > 0)
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));

  const dexRows: DexVolumeRow[] = protocolResults
    .filter(({ meta: protocolMeta, dexBase }) => protocolMeta.category === "DEX" && dexBase?.total24h)
    .map(({ meta: protocolMeta, dexBase }) => ({
      slug: protocolMeta.slug,
      name: protocolMeta.name,
      volume24h: dexBase!.total24h ?? 0,
      volume7d: dexBase!.total7d ?? 0,
      volume30d: dexBase!.total30d ?? 0,
      change1dPct: dexBase!.change_1d ?? null,
      defillamaUrl: `https://defillama.com/summary/dexs/${protocolMeta.slug}`,
    }))
    .sort((a, b) => b.volume24h - a.volume24h);

  if (dexRows.length === 0 && dexMetas.length > 0) errors.push("dex_protocols");

  return {
    ...base,
    updatedAt: new Date().toISOString(),
    sourceLabel: meta.label,
    sourceHref: meta.href,
    sourceDescription: meta.description,
    chain: {
      name: "Base",
      chainId: baseChain?.chainId ?? 8453,
      tvlUsd: baseChain?.tvl ?? null,
      rank: baseRank || null,
      totalChains: sortedChains.length || null,
    },
    tvlHistory,
    tvlChange30dPct: tvlChangePct(history30),
    stablecoins: parseStablecoinCirculating(stableRaw?.find((c) => c.name === "Base")),
    fees: feesRaw
      ? {
          total24h: feesRaw.total24h ?? 0,
          total7d: feesRaw.total7d ?? 0,
          total30d: feesRaw.total30d ?? 0,
          totalAllTime: feesRaw.totalAllTime ?? 0,
          change1dPct: feesRaw.change_1d ?? null,
        }
      : null,
    dexVolume: buildDexVolumePayload(dexOverview, dexRows),
    chainRanks,
    protocols,
    errors,
  };
}
