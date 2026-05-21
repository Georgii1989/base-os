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

export type BaseAnalyticsPayload = {
  updatedAt: string;
  source: "defillama";
  chain: {
    name: string;
    chainId: number;
    tvlUsd: number;
    rank: number;
    totalChains: number;
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
  chainRanks: ChainRankRow[];
  protocols: ProtocolTvlRow[];
  errors: string[];
};
