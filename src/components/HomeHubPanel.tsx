"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buildMetricCards } from "@/lib/analyticsMetricCards";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";
import type { OsTabId } from "@/lib/osTabs";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import { HomePulseCard } from "@/components/HomePulseCard";
import { BaseOsBriefing } from "@/components/BaseOsBriefing";

type Props = {
  setActiveTab: (tab: OsTabId) => void;
  connectedAddress?: `0x${string}`;
  onOpenCommandPalette: () => void;
};

export function HomeHubPanel({ setActiveTab, connectedAddress }: Props) {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["home-analytics"],
    queryFn: async (): Promise<BaseAnalyticsPayload> => {
      const res = await fetch("/api/analytics/base?source=defillama");
      if (!res.ok) throw new Error("analytics_failed");
      return (await res.json()) as BaseAnalyticsPayload;
    },
    staleTime: 300_000,
  });

  const { data: myScore, isLoading: scoreLoading } = useQuery({
    queryKey: ["home-score", connectedAddress],
    enabled: Boolean(connectedAddress),
    queryFn: async (): Promise<OnchainScorePayload> => {
      const res = await fetch(`/api/onchain-score?address=${connectedAddress}`);
      const json = (await res.json()) as OnchainScorePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "score_failed");
      return json;
    },
    staleTime: 120_000,
  });

  const pulse = analytics ? buildMetricCards(analytics).slice(0, 4) : [];

  return (
    <div className="grid gap-5">
      <BaseOsBriefing setActiveTab={setActiveTab} />

      <section className="os-animate-fade-up os-panel p-5 [animation-delay:80ms]">
        <p className="os-eyebrow text-slate-400">Base pulse</p>
        {analyticsLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : analytics ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pulse.map((card, i) => (
              <HomePulseCard
                key={card.label}
                card={card}
                analytics={analytics}
                onClick={() => setActiveTab("analytics")}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              />
            ))}
          </div>
        ) : null}
      </section>

      {connectedAddress ? (
        <section className="os-animate-fade-up os-panel border-violet-400/20 p-5 [animation-delay:160ms]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="os-eyebrow text-violet-200/80">Your wallet</p>
              <p className="mt-1 font-mono text-sm font-bold text-fuchsia-100">
                {shortenAddressDisplay(connectedAddress)}
              </p>
            </div>
            {scoreLoading ? (
              <div className="h-16 w-32 animate-pulse rounded-2xl bg-white/10" />
            ) : myScore ? (
              <div className="text-right">
                <p className="text-4xl font-black text-white">{myScore.score.score}</p>
                <p className="text-sm font-bold text-fuchsia-200">Grade {myScore.score.grade}</p>
              </div>
            ) : null}
          </div>
          {myScore ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("score")}
                className="os-cta os-display px-4 py-2 text-sm"
              >
                Full score & breakdown
              </button>
              <Link
                href={`/card/${connectedAddress}`}
                className="rounded-xl border border-cyan-300/35 px-4 py-2 text-sm font-bold text-cyan-100"
              >
                Identity card ↗
              </Link>
              <Link
                href={`/${connectedAddress}`}
                className="rounded-xl border border-fuchsia-300/35 px-4 py-2 text-sm font-bold text-fuchsia-100"
              >
                Tip profile ↗
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="os-animate-fade-up os-panel border-dashed p-5 text-center [animation-delay:160ms]">
          <p className="text-sm text-slate-400">
            Connect a wallet to see your score here, or paste any address on the{" "}
            <button
              type="button"
              onClick={() => setActiveTab("score")}
              className="font-bold text-cyan-300 hover:underline"
            >
              Onchain score
            </button>{" "}
            tab.
          </p>
        </section>
      )}

    </div>
  );
}
