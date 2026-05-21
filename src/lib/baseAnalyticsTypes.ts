import type { AnalyticsSourceId } from "@/lib/analyticsSources";

export type TvlPoint = { date: number; tvl: number };

export type ChainRankRow = {
  name: string;
  tvl: number;
  rank: number;
  isBase: boolean;
};

export type ProtocolTvlRow = {
  slug: string;
  name: string;
  category: string;
  tvlUsd: number | null;
  defillamaUrl: string;
};

export type DexVolumeRow = {
  slug: string;
  name: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  change1dPct: number | null;
  defillamaUrl: string;
};

export type ActivityPoint = {
  date: number;
  transactions: number;
  uops: number | null;
};

export type OnchainStats = {
  transactionsToday: number;
  totalTransactions: number;
  totalAddresses: number;
  totalBlocks: number;
  gasGwei: { slow: number; average: number; fast: number };
  networkUtilizationPct: number;
  ethPriceUsd: number | null;
  ethPriceChange24hPct: number | null;
  averageBlockTimeMs: number | null;
};

export type BaseAnalyticsPayload = {
  updatedAt: string;
  source: AnalyticsSourceId;
  sourceLabel: string;
  sourceHref: string;
  sourceDescription: string;
  chain: {
    name: string;
    chainId: number;
    tvlUsd: number | null;
    rank: number | null;
    totalChains: number | null;
  };
  tvlHistory: TvlPoint[];
  tvlChange30dPct: number | null;
  stablecoins: {
    circulatingUsd: number;
    breakdown: { label: string; usd: number }[];
  } | null;
  fees: {
    total24h: number;
    total7d: number;
    total30d: number;
    totalAllTime: number;
    change1dPct: number | null;
  } | null;
  dexVolume: {
    total24h: number;
    total7d: number;
    total30d: number;
    change1dPct: number | null;
    source: "overview" | "aggregated";
    byProtocol: DexVolumeRow[];
  } | null;
  activity: {
    history: ActivityPoint[];
    transactionsLatest: number;
    uopsLatest: number | null;
    change7dPct: number | null;
    avgTransactions7d: number | null;
  } | null;
  onchain: OnchainStats | null;
  chainRanks: ChainRankRow[];
  protocols: ProtocolTvlRow[];
  errors: string[];
};
