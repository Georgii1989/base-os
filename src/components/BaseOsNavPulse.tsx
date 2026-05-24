"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCompactNumber, formatUsd } from "@/lib/baseAnalyticsFormat";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";
import { groupForTab, OS_TAB_GROUPS, tabMeta, type OsTabGroupId } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";
import { radarProjects } from "@/lib/radarProjects";

const GROUP_ANGLE: Record<OsTabGroupId, number> = {
  hub: -90,
  trade: -18,
  build: 54,
  you: 126,
  explore: 198,
};

const GROUP_GLOW: Record<OsTabGroupId, string> = {
  hub: "#22d3ee",
  trade: "#a78bfa",
  build: "#e879f9",
  you: "#34d399",
  explore: "#fbbf24",
};

function nodePos(angleDeg: number, cx: number, cy: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

type Props = {
  activeTab: OsTabId;
  onSelect: (tab: OsTabId) => void;
};

export function BaseOsNavPulse({ activeTab, onSelect }: Props) {
  const activeGroup = groupForTab(activeTab);
  const activeMeta = tabMeta(activeTab);

  const { data: analytics } = useQuery({
    queryKey: ["nav-pulse-analytics"],
    queryFn: async (): Promise<BaseAnalyticsPayload> => {
      const res = await fetch("/api/analytics/base?source=defillama");
      if (!res.ok) throw new Error("analytics_failed");
      return (await res.json()) as BaseAnalyticsPayload;
    },
    staleTime: 300_000,
  });

  const tvl = analytics?.chain?.tvlUsd ?? null;
  const txs =
    analytics?.activity?.transactionsLatest ??
    analytics?.onchain?.transactionsToday ??
    null;

  const nodes = useMemo(() => {
    const cx = 140;
    const cy = 96;
    const r = 68;
    return OS_TAB_GROUPS.map((group) => ({
      group,
      ...nodePos(GROUP_ANGLE[group.id], cx, cy, r),
    }));
  }, []);

  return (
    <aside
      className="relative hidden min-h-[220px] overflow-hidden rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/10 via-[#070313]/90 to-cyan-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_40px_rgba(139,92,246,0.12)] lg:block"
      aria-label="Base OS system map"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl os-animate-glow" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-cyan-400/15 blur-2xl os-animate-glow [animation-delay:1.2s]" />

      <div className="relative flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-200/90">
            System map
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">Live on Base</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Online
        </span>
      </div>

      <svg
        viewBox="0 0 280 192"
        className="relative mt-2 h-[168px] w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id="nav-pulse-core" cx="50%" cy="50%" r="50%">
            <stop stopColor="#A855F7" stopOpacity="0.45" />
            <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
          </radialGradient>
          <filter id="nav-node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="140" cy="96" r="52" fill="url(#nav-pulse-core)" className="os-animate-ring" />

        <ellipse
          cx="140"
          cy="96"
          rx="78"
          ry="34"
          fill="none"
          stroke="rgba(34,211,238,0.22)"
          strokeWidth="1"
          strokeDasharray="4 6"
          className="origin-center animate-[spin_36s_linear_infinite]"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />

        {nodes.map(({ group, x, y }) => {
          const isActive = activeGroup?.id === group.id;
          const color = GROUP_GLOW[group.id];
          return (
            <g key={group.id}>
              <line
                x1="140"
                y1="96"
                x2={x}
                y2={y}
                stroke={isActive ? color : "rgba(255,255,255,0.12)"}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={isActive ? undefined : "3 4"}
                opacity={isActive ? 0.85 : 0.55}
              />
              {isActive ? (
                <circle
                  cx={x}
                  cy={y}
                  r="22"
                  fill={color}
                  opacity="0.12"
                  className="animate-pulse"
                />
              ) : null}
            </g>
          );
        })}

        <g filter="url(#nav-node-glow)">
          <circle cx="140" cy="96" r="26" fill="#0a0614" stroke="rgba(255,255,255,0.2)" strokeWidth="1.25" />
          <text
            x="140"
            y="92"
            textAnchor="middle"
            fill="#F5D0FE"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.12em"
          >
            {activeMeta.eyebrow.toUpperCase()}
          </text>
          <text x="140" y="106" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800">
            {activeMeta.label.length > 12 ? activeMeta.label.slice(0, 11) + "…" : activeMeta.label}
          </text>
        </g>

        {nodes.map(({ group, x, y }) => {
          const isActive = activeGroup?.id === group.id;
          const color = GROUP_GLOW[group.id];
          const firstTab = group.tabIds[0]!;
          return (
            <g
              key={`node-${group.id}`}
              className="cursor-pointer"
              onClick={() => onSelect(firstTab)}
              role="presentation"
            >
              <circle
                cx={x}
                cy={y}
                r={isActive ? 18 : 15}
                fill="#0c0618"
                stroke={isActive ? color : "rgba(255,255,255,0.22)"}
                strokeWidth={isActive ? 2 : 1.25}
              />
              <text
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                fill={isActive ? color : "#94a3b8"}
                fontSize="8"
                fontWeight="800"
                letterSpacing="0.08em"
              >
                {group.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="relative mt-1 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-cyan-300/20 bg-black/35 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Base TVL</p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-cyan-100">{formatUsd(tvl)}</p>
        </div>
        <div className="rounded-xl border border-violet-300/20 bg-black/35 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Tx · day</p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-violet-100">
            {formatCompactNumber(txs)}
          </p>
        </div>
        <div className="rounded-xl border border-fuchsia-300/20 bg-black/35 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Radar</p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-fuchsia-100">
            {radarProjects.length} apps
          </p>
        </div>
      </div>
    </aside>
  );
}
