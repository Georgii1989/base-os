"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatPct, formatUsd } from "@/lib/baseAnalyticsFormat";
import { buildMetricCards } from "@/lib/analyticsMetricCards";
import {
  ANALYTICS_SOURCES,
  type AnalyticsSourceId,
  parseAnalyticsSource,
} from "@/lib/analyticsSources";
import { AnalyticsLineChart } from "@/components/AnalyticsLineChart";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";

const SOURCE_STORAGE_KEY = "base-os-analytics-source";

function readStoredSource(): AnalyticsSourceId {
  if (typeof window === "undefined") return "defillama";
  try {
    return parseAnalyticsSource(localStorage.getItem(SOURCE_STORAGE_KEY));
  } catch {
    return "defillama";
  }
}

function MetricCard({
  label,
  value,
  hint,
  accent = "cyan",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "emerald" | "amber" | "fuchsia";
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-300/30"
      : accent === "amber"
        ? "border-amber-300/30"
        : accent === "fuchsia"
          ? "border-fuchsia-300/30"
          : "border-cyan-300/30";
  const text =
    accent === "emerald"
      ? "text-emerald-200"
      : accent === "amber"
        ? "text-amber-200"
        : accent === "fuchsia"
          ? "text-fuchsia-200"
          : "text-cyan-200";

  return (
    <div className={`rounded-2xl border ${border} bg-black/35 p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${text}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function AnalyticsBody({ data }: { data: BaseAnalyticsPayload }) {
  const chartPoints =
    data.source === "l2beat"
      ? (data.activity?.history.map((p) => ({ date: p.date, value: p.transactions })) ?? [])
      : data.tvlHistory.map((p) => ({ date: p.date, value: p.tvl }));

  const chartPositive = (data.tvlChange30dPct ?? 0) >= 0;
  const chartAccent =
    data.source === "l2beat" ? "fuchsia" : chartPositive ? "emerald" : "fuchsia";
  const chartFormatter =
    data.source === "l2beat"
      ? (v: number) => v.toLocaleString("en-US")
      : (v: number) => formatUsd(v);
  const maxChainTvl = Math.max(...data.chainRanks.map((c) => c.tvl), 1);
  const maxProtocolTvl = Math.max(...data.protocols.map((p) => p.tvlUsd ?? 0), 1);
  const maxDexVol = Math.max(...(data.dexVolume?.byProtocol.map((p) => p.volume24h) ?? [1]), 1);
  const metricCards = buildMetricCards(data);

  return (
    <>
      {data.errors.length > 0 ? (
        <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          Partial data — some feeds did not load ({data.errors.join(", ")}).
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {data.source === "blockscout" && data.onchain ? (
        <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/50 p-5">
          <h3 className="text-lg font-black text-cyan-100">Network snapshot</h3>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li className="flex justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Blocks indexed</span>
              <span className="font-bold text-white">
                {data.onchain.totalBlocks.toLocaleString("en-US")}
              </span>
            </li>
            <li className="flex justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Block time</span>
              <span className="font-bold text-white">
                {data.onchain.averageBlockTimeMs != null
                  ? `${(data.onchain.averageBlockTimeMs / 1000).toFixed(1)}s`
                  : "—"}
              </span>
            </li>
            <li className="flex justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2">
              <span className="text-slate-400">ETH price</span>
              <span className="font-bold text-white">
                {data.onchain.ethPriceUsd != null ? formatUsd(data.onchain.ethPriceUsd) : "—"}
              </span>
            </li>
            <li className="flex justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2">
              <span className="text-slate-400">DeFi TVL (ref)</span>
              <span className="font-bold text-white">{formatUsd(data.chain.tvlUsd)}</span>
            </li>
          </ul>
        </section>
      ) : null}

      {chartPoints.length >= 2 ? (
        <>
          <section className="rounded-3xl border border-cyan-300/25 bg-slate-950/55 p-5 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-black text-cyan-100">
                {data.source === "l2beat" ? "Transaction activity" : "TVL history"}
              </h3>
              <span className="text-xs text-slate-500">~90 days · hover for values</span>
            </div>
            <div className="mt-5">
              <AnalyticsLineChart
                points={chartPoints}
                positive={chartPositive}
                formatValue={chartFormatter}
                accent={chartAccent}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {data.source === "defillama" ? (
            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
              <h3 className="text-lg font-black text-white">Fees on Base</h3>
              {data.fees ? (
                <ul className="mt-4 grid gap-2 text-sm">
                  <li className="flex justify-between border-b border-white/5 py-2">
                    <span className="text-slate-400">24h</span>
                    <span className="font-bold text-white">{formatUsd(data.fees.total24h)}</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 py-2">
                    <span className="text-slate-400">7d</span>
                    <span className="font-bold text-white">{formatUsd(data.fees.total7d)}</span>
                  </li>
                  <li className="flex justify-between border-b border-white/5 py-2">
                    <span className="text-slate-400">30d</span>
                    <span className="font-bold text-white">{formatUsd(data.fees.total30d)}</span>
                  </li>
                  <li className="flex justify-between py-2">
                    <span className="text-slate-400">All time</span>
                    <span className="font-bold text-emerald-200">{formatUsd(data.fees.totalAllTime)}</span>
                  </li>
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Fees data unavailable.</p>
              )}
            </section>
          ) : data.source === "l2beat" && data.activity ? (
            <section className="rounded-3xl border border-fuchsia-300/20 bg-slate-950/50 p-5">
              <h3 className="text-lg font-black text-fuchsia-100">Latest day</h3>
              <ul className="mt-4 grid gap-2 text-sm">
                <li className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-400">Transactions</span>
                  <span className="font-bold text-white">
                    {data.activity.transactionsLatest.toLocaleString("en-US")}
                  </span>
                </li>
                <li className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-slate-400">UOPS</span>
                  <span className="font-bold text-white">
                    {data.activity.uopsLatest?.toLocaleString("en-US") ?? "—"}
                  </span>
                </li>
                <li className="flex justify-between py-2">
                  <span className="text-slate-400">7d change</span>
                  <span className="font-bold text-emerald-200">{formatPct(data.activity.change7dPct)}</span>
                </li>
              </ul>
            </section>
          ) : null}
          </div>
        </>
      ) : null}

      {data.dexVolume && data.dexVolume.byProtocol.length > 0 ? (
        <section className="rounded-3xl border border-fuchsia-300/20 bg-slate-950/50 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-black text-fuchsia-100">DEX volume on Base</h3>
            <span className="text-xs text-slate-500">
              7d {formatUsd(data.dexVolume.total7d)} · 30d {formatUsd(data.dexVolume.total30d)}
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {data.dexVolume.byProtocol.map((row) => (
              <li key={row.slug}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <a
                    href={row.defillamaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-fuchsia-200 hover:underline"
                  >
                    {row.name}
                  </a>
                  <span className={(row.change1dPct ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {formatPct(row.change1dPct)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-fuchsia-500/80"
                      style={{ width: `${Math.max(4, (row.volume24h / maxDexVol) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs font-bold text-white">
                    {formatUsd(row.volume24h)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.stablecoins && data.stablecoins.breakdown.length > 0 ? (
        <section className="rounded-3xl border border-amber-300/20 bg-slate-950/50 p-5">
          <h3 className="text-lg font-black text-amber-100">Stablecoin supply</h3>
          <p className="mt-1 text-sm text-slate-400">
            Total {formatUsd(data.stablecoins.circulatingUsd)} circulating on Base.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.stablecoins.breakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm"
              >
                <span className="text-slate-400">{row.label}</span>
                <span className="font-bold text-amber-100">{formatUsd(row.usd)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.chainRanks.length > 0 || data.protocols.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.chainRanks.length > 0 ? (
            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
              <h3 className="text-lg font-black text-white">Chains by TVL</h3>
              <p className="mt-1 text-xs text-slate-500">Base highlighted among top L1/L2s.</p>
              <ul className="mt-4 space-y-2">
                {data.chainRanks.map((row) => (
                  <li key={row.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className={row.isBase ? "font-black text-cyan-200" : "text-slate-400"}>
                        #{row.rank} {row.name}
                      </span>
                      <span className="font-bold text-slate-200">{formatUsd(row.tvl)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${row.isBase ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500" : "bg-slate-600"}`}
                        style={{ width: `${Math.max(4, (row.tvl / maxChainTvl) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.protocols.length > 0 ? (
            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
              <h3 className="text-lg font-black text-white">Top protocols on Base</h3>
              <p className="mt-1 text-xs text-slate-500">TVL on Base from DeFi Llama protocol pages.</p>
              <ul className="mt-4 space-y-2">
                {data.protocols.map((row) => (
                  <li key={row.slug}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <a
                        href={row.defillamaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-cyan-200 hover:underline"
                      >
                        {row.name}
                      </a>
                      <span className="shrink-0 text-slate-500">{row.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-cyan-500/80"
                          style={{
                            width: `${Math.max(4, ((row.tvlUsd ?? 0) / maxProtocolTvl) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs font-bold text-white">
                        {formatUsd(row.tvlUsd)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function BaseAnalyticsPanel() {
  const [source, setSource] = useState<AnalyticsSourceId>(readStoredSource);

  function selectSource(next: AnalyticsSourceId) {
    setSource(next);
    try {
      localStorage.setItem(SOURCE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const activeMeta = ANALYTICS_SOURCES.find((s) => s.id === source) ?? ANALYTICS_SOURCES[0];

  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["base-analytics", source],
    queryFn: async (): Promise<BaseAnalyticsPayload> => {
      const res = await fetch(`/api/analytics/base?source=${source}`);
      if (!res.ok) throw new Error("analytics_fetch_failed");
      return res.json() as Promise<BaseAnalyticsPayload>;
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">Base chain</p>
            <h2 className="text-3xl font-black text-white md:text-4xl">Analytics</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300/90">
              {activeMeta.description}. Source:{" "}
              <a
                href={activeMeta.href}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-cyan-300 underline underline-offset-2"
              >
                {activeMeta.label}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {updatedLabel ? <span>Updated {updatedLabel}</span> : null}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 disabled:opacity-50"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Analytics data source"
        >
          {ANALYTICS_SOURCES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={source === item.id}
              onClick={() => selectSource(item.id)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                source === item.id
                  ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-50"
                  : "border-white/12 bg-black/25 text-slate-400 hover:border-white/25 hover:text-slate-200"
              }`}
            >
              <span className="block text-sm font-black">{item.label}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-500">{item.description}</span>
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-3xl bg-white/5" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-3xl border border-rose-300/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="font-bold">Could not load {activeMeta.label} analytics.</p>
          <p className="mt-2 text-sm text-rose-200/90">Try another source or refresh in a moment.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl border border-rose-200/40 bg-rose-500/20 px-4 py-2 text-sm font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <AnalyticsBody data={data} />
      )}
    </div>
  );
}
