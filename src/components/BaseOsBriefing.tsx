"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { base, mainnet } from "wagmi/chains";
import { useAccount, useBalance, useReadContract } from "wagmi";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";
import {
  buildBriefingItems,
  loadScoreSnapshot,
  saveScoreSnapshot,
  type BriefingItem,
} from "@/lib/baseOsBriefing";
import type { OsTabId } from "@/lib/osTabs";
import { resolveTipJarAddress } from "@/lib/tipContracts";

const SBT_ABI = [
  {
    type: "function",
    name: "hasBadge",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ACCENT_BORDER: Record<BriefingItem["accent"], string> = {
  cyan: "border-cyan-400/30 hover:border-cyan-400/50",
  emerald: "border-emerald-400/30 hover:border-emerald-400/50",
  amber: "border-amber-400/30 hover:border-amber-400/50",
  fuchsia: "border-fuchsia-400/30 hover:border-fuchsia-400/50",
  violet: "border-violet-400/30 hover:border-violet-400/50",
};

type RadarRow = { id: string; symbol?: string; change24h: number | null };

export function BaseOsBriefing({
  setActiveTab,
}: {
  setActiveTab: (tab: OsTabId) => void;
}) {
  const { address, isConnected } = useAccount();
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS?.trim() as `0x${string}` | undefined;

  const { data: ethBase } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: Boolean(address) },
  });
  const { data: ethMainnet } = useBalance({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address) },
  });

  const { data: hasBadge } = useReadContract({
    address: sbtAddress,
    abi: SBT_ABI,
    functionName: "hasBadge",
    args: address ? [address] : undefined,
    chainId: base.id,
    query: { enabled: Boolean(sbtAddress && address) },
  });

  const { data: scorePayload } = useQuery({
    queryKey: ["briefing-score", address],
    enabled: Boolean(address),
    queryFn: async (): Promise<OnchainScorePayload> => {
      const res = await fetch(`/api/onchain-score?address=${address}`);
      const json = (await res.json()) as OnchainScorePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "score_failed");
      return json;
    },
    staleTime: 120_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["briefing-analytics"],
    queryFn: async (): Promise<BaseAnalyticsPayload> => {
      const res = await fetch("/api/analytics/base?source=defillama");
      if (!res.ok) throw new Error("analytics_failed");
      return (await res.json()) as BaseAnalyticsPayload;
    },
    staleTime: 300_000,
  });

  const { data: radarRows } = useQuery({
    queryKey: ["briefing-radar"],
    queryFn: async (): Promise<RadarRow[]> => {
      const res = await fetch("/api/radar");
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: RadarRow[] };
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  const scoreDelta = useMemo(() => {
    if (!address || scorePayload?.score.score == null) return null;
    const prev = loadScoreSnapshot(address);
    return prev != null ? scorePayload.score.score - prev : null;
  }, [address, scorePayload?.score.score]);

  useEffect(() => {
    if (address && scorePayload?.score.score != null) {
      saveScoreSnapshot(address, scorePayload.score.score);
    }
  }, [address, scorePayload?.score.score]);

  const topMover = useMemo(() => {
    if (!radarRows?.length) return null;
    const sorted = [...radarRows]
      .filter((r) => r.change24h != null)
      .sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0));
    const top = sorted[0];
    if (!top || top.change24h == null) return null;
    return { name: top.symbol ?? top.id, change24h: top.change24h };
  }, [radarRows]);

  const gasGwei = analytics?.onchain?.gasGwei.average ?? null;

  const items = buildBriefingItems({
    isConnected,
    ethOnBase: ethBase ? Number(formatUnits(ethBase.value, 18)) : null,
    ethOnMainnet: ethMainnet ? Number(formatUnits(ethMainnet.value, 18)) : null,
    score: scorePayload?.score.score ?? null,
    grade: scorePayload?.score.grade ?? null,
    scoreDelta,
    hasTipBadge: hasBadge === true ? true : hasBadge === false ? false : undefined,
    gasGwei,
    radarTopMover: topMover,
    tvlChange30dPct: analytics?.tvlChange30dPct ?? null,
  });

  return (
    <section className="os-animate-fade-up os-panel border-violet-400/20 bg-gradient-to-br from-violet-500/8 via-slate-950/80 to-amber-500/5 p-5 shadow-[0_0_48px_rgba(139,92,246,0.1)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="os-eyebrow text-violet-200/90">Base OS Briefing</p>
          <h2 className="os-display mt-2 text-2xl font-semibold text-white md:text-3xl">
            {isConnected && address ? `Your command center` : `One system for Base`}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Personalized actions from score, balances, network pulse, and radar — updated live.
          </p>
        </div>
        {isConnected && address ? (
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Wallet</p>
            <p className="font-mono text-xs font-bold text-cyan-200">
              {address.slice(0, 6)}…{address.slice(-4)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <BriefingCard
            key={item.id}
            item={item}
            delayMs={80 + i * 50}
            onAction={() => {
              if (item.tab) setActiveTab(item.tab);
              else if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-[10px] text-slate-600">
        Tip router · {resolveTipJarAddress().slice(0, 10)}… · Simulate tx in ⌘K
      </p>
    </section>
  );
}

function BriefingCard({
  item,
  onAction,
  delayMs,
}: {
  item: BriefingItem;
  onAction: () => void;
  delayMs: number;
}) {
  return (
    <button
      type="button"
      onClick={onAction}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`os-animate-fade-up os-panel-bento group flex flex-col p-4 ${ACCENT_BORDER[item.accent]}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white group-hover:text-amber-100">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.description}</p>
        </div>
      </div>
      <span className="mt-3 text-xs font-black uppercase tracking-wide text-cyan-300/90">
        {item.cta} →
      </span>
    </button>
  );
}
