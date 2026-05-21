import { downsampleTvlSeries, tvlChangePct } from "@/lib/baseAnalyticsFormat";
import type { ActivityPoint, BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import { getAnalyticsSourceMeta } from "@/lib/analyticsSources";
import { emptyAnalyticsPayload } from "@/lib/analytics/emptyPayload";
import { fetchDefiLlamaJson } from "@/lib/fetchDefiLlama";

type L2BeatActivityResponse = {
  success?: boolean;
  data?: {
    chart?: {
      types?: string[];
      data?: [number, number, number][];
    };
  };
};

function downsampleActivity(points: ActivityPoint[], maxPoints = 90): ActivityPoint[] {
  if (points.length <= maxPoints) return points;
  const asTvl = points.map((p) => ({ date: p.date, tvl: p.transactions }));
  const sampled = downsampleTvlSeries(asTvl, maxPoints);
  const byDate = new Map(points.map((p) => [p.date, p]));
  return sampled.map((row) => {
    const full = byDate.get(row.date);
    return full ?? { date: row.date, transactions: row.tvl, uops: null };
  });
}

export async function fetchL2BeatAnalytics(): Promise<BaseAnalyticsPayload> {
  const meta = getAnalyticsSourceMeta("l2beat");
  const base = emptyAnalyticsPayload("l2beat");
  const errors: string[] = [];

  const [activityRaw, chainsRaw] = await Promise.all([
    fetchDefiLlamaJson<L2BeatActivityResponse>(
      "https://l2beat.com/api/scaling/activity/base",
      300,
      35_000
    ),
    fetchDefiLlamaJson<{ name: string; tvl: number }[]>("https://api.llama.fi/v2/chains", 300, 20_000),
  ]);

  const baseTvl = chainsRaw?.find((c) => c.name === "Base")?.tvl ?? null;

  const rows = activityRaw?.data?.chart?.data ?? [];
  if (rows.length === 0) errors.push("activity");

  const historyFull: ActivityPoint[] = rows.map(([date, count, uops]) => ({
    date,
    transactions: count,
    uops: typeof uops === "number" ? uops : null,
  }));

  const history = downsampleActivity(historyFull, 90);
  const last = historyFull.at(-1);
  const weekAgo = historyFull.at(-8);
  const change7dPct =
    last && weekAgo && weekAgo.transactions > 0
      ? ((last.transactions - weekAgo.transactions) / weekAgo.transactions) * 100
      : null;

  const last7 = historyFull.slice(-7);
  const avgTransactions7d =
    last7.length > 0
      ? last7.reduce((sum, row) => sum + row.transactions, 0) / last7.length
      : null;

  const txHistory = history.map((p) => ({ date: p.date, tvl: p.transactions }));
  const tvlChange30dPct = tvlChangePct(txHistory.slice(-30));

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
    tvlHistory: txHistory,
    tvlChange30dPct,
    activity: last
      ? {
          history,
          transactionsLatest: last.transactions,
          uopsLatest: last.uops,
          change7dPct,
          avgTransactions7d,
        }
      : null,
    errors,
  };
}
