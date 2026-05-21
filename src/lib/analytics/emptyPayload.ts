import type { AnalyticsSourceId } from "@/lib/analyticsSources";
import { getAnalyticsSourceMeta } from "@/lib/analyticsSources";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";

export function emptyAnalyticsPayload(source: AnalyticsSourceId): BaseAnalyticsPayload {
  const meta = getAnalyticsSourceMeta(source);
  return {
    updatedAt: new Date().toISOString(),
    source: meta.id,
    sourceLabel: meta.label,
    sourceHref: meta.href,
    sourceDescription: meta.description,
    chain: { name: "Base", chainId: 8453, tvlUsd: null, rank: null, totalChains: null },
    tvlHistory: [],
    tvlChange30dPct: null,
    stablecoins: null,
    fees: null,
    dexVolume: null,
    activity: null,
    onchain: null,
    chainRanks: [],
    protocols: [],
    errors: [],
  };
}
