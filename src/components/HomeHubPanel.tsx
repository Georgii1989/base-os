"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { buildMetricCards } from "@/lib/analyticsMetricCards";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";
import type { OsTabId } from "@/lib/osTabs";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";

type Props = {
  setActiveTab: (tab: OsTabId) => void;
  connectedAddress?: `0x${string}`;
  onOpenCommandPalette: () => void;
};

const MODULES: {
  tab: OsTabId;
  title: string;
  text: string;
  cta: string;
  accent: string;
}[] = [
  {
    tab: "score",
    title: "Onchain score",
    text: "Paste any address — txs, contracts, bridges, grade.",
    cta: "Check score",
    accent: "from-cyan-500/20 to-fuchsia-500/10",
  },
  {
    tab: "analytics",
    title: "Base analytics",
    text: "TVL, fees, stables, DEX — live charts.",
    cta: "Open analytics",
    accent: "from-emerald-500/15 to-cyan-500/10",
  },
  {
    tab: "radar",
    title: "Project radar",
    text: "Curated Base apps with prices.",
    cta: "Browse apps",
    accent: "from-violet-500/15 to-fuchsia-500/10",
  },
  {
    tab: "watch",
    title: "Tracked wallets",
    text: "Pin addresses — balance & activity in-browser.",
    cta: "Open tracker",
    accent: "from-emerald-500/10 to-teal-500/10",
  },
  {
    tab: "launch",
    title: "Launch token",
    text: "Deploy your ERC-20 on Base — you pay gas.",
    cta: "Create token",
    accent: "from-emerald-500/20 to-cyan-500/10",
  },
  {
    tab: "tip",
    title: "Tips & badge",
    text: "Send tips, mint supporter badge.",
    cta: "Open tips",
    accent: "from-fuchsia-500/20 to-rose-500/10",
  },
  {
    tab: "guard",
    title: "Token guard",
    text: "Review and revoke token approvals.",
    cta: "Open guard",
    accent: "from-amber-500/15 to-orange-500/10",
  },
  {
    tab: "lens",
    title: "Txn preview",
    text: "Simulate a call — no wallet send.",
    cta: "Open preview",
    accent: "from-slate-500/20 to-cyan-500/10",
  },
];

export function HomeHubPanel({ setActiveTab, connectedAddress, onOpenCommandPalette }: Props) {
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
      <section className="rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-fuchsia-500/10 p-6 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/90">Home</p>
        <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Your Base command center</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Network pulse, your onchain score, and one-click jumps to every module. Press{" "}
          <kbd className="rounded border border-white/15 bg-black/50 px-1.5 py-0.5 font-mono text-xs">
            ⌘K
          </kbd>{" "}
          for quick search.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-100"
          >
            Quick menu ⌘K
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("score")}
            className="rounded-xl border border-white/12 px-4 py-2 text-sm font-bold text-slate-200 hover:border-white/30"
          >
            Check any score
          </button>
          <Link
            href="/safety"
            className="rounded-xl border border-teal-300/35 bg-teal-500/10 px-4 py-2 text-sm font-bold text-teal-100"
          >
            Address lookup ↗
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Base pulse</p>
        {analyticsLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pulse.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => setActiveTab("analytics")}
                className="rounded-2xl border border-white/8 bg-black/30 p-4 text-left transition hover:border-cyan-300/40"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-black text-white">{card.value}</p>
                {card.hint ? <p className="mt-1 text-xs text-slate-500">{card.hint}</p> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {connectedAddress ? (
        <section className="rounded-3xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-200/80">
                Your wallet
              </p>
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
                className="rounded-xl bg-gradient-to-r from-cyan-500/80 to-fuchsia-500/70 px-4 py-2 text-sm font-black text-white"
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
        <section className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-center">
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

      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Modules</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((card) => (
            <button
              key={card.tab}
              type="button"
              onClick={() => setActiveTab(card.tab)}
              className={`rounded-3xl border border-white/12 bg-gradient-to-br ${card.accent} p-5 text-left transition hover:border-cyan-200/40`}
            >
              <h3 className="text-lg font-black text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{card.text}</p>
              <p className="mt-4 text-sm font-black text-cyan-200">{card.cta} →</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
