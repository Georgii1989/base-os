"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";
import { GuardPanel } from "@/components/GuardPanel";
import { WalletCardPanel } from "@/components/WalletCardPanel";
import { radarProjects, type RadarProject } from "@/lib/radarProjects";

type TabId = "home" | "tip" | "radar" | "guard" | "wallet";

const tabs: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "home", label: "Home", eyebrow: "Overview" },
  { id: "tip", label: "Tip", eyebrow: "Support" },
  { id: "radar", label: "Radar", eyebrow: "Discover" },
  { id: "guard", label: "Guard", eyebrow: "Safety" },
  { id: "wallet", label: "Wallet Card", eyebrow: "Identity" },
];

type RadarMarketData = {
  id: string;
  symbol: string;
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  dex: string | null;
  pairUrl: string | null;
  sparkline: number[];
};

export function BaseOsShell() {
  const [activeTab, setActiveTab] = useState<TabId>("tip");
  const { address } = useAccount();
  const activeMeta = useMemo(() => tabs.find((tab) => tab.id === activeTab), [activeTab]);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  function focusTabAt(rawIndex: number) {
    const len = tabs.length;
    const next = ((rawIndex % len) + len) % len;
    const id = tabs[next].id;
    setActiveTab(id);
    requestAnimationFrame(() => {
      tabButtonRefs.current[next]?.focus();
    });
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTabAt(activeIndex + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTabAt(activeIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      focusTabAt(tabs.length - 1);
    }
  }

  return (
    <section className="relative z-10 w-full max-w-7xl rounded-3xl border border-white/15 bg-black/35 p-4 text-white shadow-[0_0_60px_rgba(76,29,149,0.45)] backdrop-blur-xl md:p-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">
            Base ecosystem hub
          </p>
          <h1 className="mt-1 text-3xl font-black text-fuchsia-100 md:text-5xl">Base OS</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200/80">
            One place for Base activity, discovery, safety, and lightweight community tools.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Current module</p>
          <p className="text-lg font-black text-cyan-100">{activeMeta?.label}</p>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="Base OS modules"
        className="mt-4 flex flex-wrap gap-2"
        onKeyDown={handleTabKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabButtonRefs.current[index] = element;
            }}
            id={`base-os-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`base-os-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-2xl border px-4 py-2 text-left transition ${
              activeTab === tab.id
                ? "border-cyan-200/80 bg-cyan-400/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-200/40 hover:bg-cyan-400/10"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{tab.eyebrow}</p>
            <p className="text-sm font-black">{tab.label}</p>
          </button>
        ))}
      </nav>

      <div
        id={`base-os-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`base-os-tab-${activeTab}`}
        tabIndex={0}
        className="mt-5 outline-none"
      >
        {activeTab === "home" ? <HomePanel connectedAddress={address} setActiveTab={setActiveTab} /> : null}
        {activeTab === "tip" ? (
          <div className="flex flex-col items-center gap-4">
            {address ? (
              <Link
                href={`/${address}`}
                className="text-sm font-bold text-fuchsia-200 underline decoration-fuchsia-500/40 underline-offset-4 hover:text-fuchsia-100"
              >
                Open your tip profile
              </Link>
            ) : null}
            <div className="flex justify-center">
              <BaseBuilderApp />
            </div>
          </div>
        ) : null}
        {activeTab === "radar" ? <RadarPanel /> : null}
        {activeTab === "guard" ? <GuardPanel /> : null}
        {activeTab === "wallet" ? <WalletCardPanel /> : null}
      </div>
    </section>
  );
}

function HomePanel({
  setActiveTab,
  connectedAddress,
}: {
  setActiveTab: (tab: TabId) => void;
  connectedAddress?: `0x${string}`;
}) {
  const cards: { tab: TabId; title: string; text: string; cta: string }[] = [
    {
      tab: "tip",
      title: "Tip + Soulbound Badge",
      text: "Support activity, mint a supporter SBT, and keep a public onchain registry.",
      cta: "Open Tip",
    },
    {
      tab: "radar",
      title: "Project Radar",
      text: "Curated Base projects with links, risk tags, and live quotes (DexScreener, DefiLlama, optional CMC).",
      cta: "Explore Radar",
    },
    {
      tab: "guard",
      title: "Allowance Guard",
      text: "Read ERC-20 allowances on Base and jump to revoke.cash for bulk cleanup.",
      cta: "Open Guard",
    },
  ];

  return (
    <div className="grid gap-4">
      {connectedAddress ? (
        <div className="flex flex-col justify-between gap-3 rounded-3xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-200/80">Your wallet</p>
            <p className="mt-1 text-sm text-fuchsia-100/90">View public tip stats and history for this address.</p>
          </div>
          <Link
            href={`/${connectedAddress}`}
            className="shrink-0 rounded-2xl border border-fuchsia-200/50 bg-fuchsia-500/20 px-4 py-2 text-center text-sm font-black text-fuchsia-50"
          >
            Tip profile →
          </Link>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.tab}
            type="button"
            onClick={() => setActiveTab(card.tab)}
            className="rounded-3xl border border-white/15 bg-slate-950/50 p-5 text-left transition hover:border-cyan-200/50 hover:bg-cyan-500/10"
          >
            <h2 className="text-xl font-black text-cyan-100">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-200/80">{card.text}</p>
            <p className="mt-5 text-sm font-black text-fuchsia-200">{card.cta}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function RadarPanel() {
  type RadarPayload = { updatedAt?: string; data?: RadarMarketData[] };

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["radar", "market"],
    queryFn: async (): Promise<RadarPayload> => {
      const response = await fetch("/api/radar");
      if (!response.ok) throw new Error("market-data");
      return (await response.json()) as RadarPayload;
    },
    staleTime: 55_000,
    refetchInterval: 60_000,
  });

  const marketData = useMemo(() => {
    const next: Record<string, RadarMarketData> = {};
    for (const item of data?.data ?? []) {
      next[item.id] = item;
    }
    return next;
  }, [data]);

  const marketError = isError ? "Live market data is temporarily unavailable." : null;
  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
    : dataUpdatedAt
      ? new Date(dataUpdatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : null;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const categoryOptions = useMemo(
    () => ["All", ...Array.from(new Set(radarProjects.flatMap((project) => project.categories))).sort()],
    []
  );

  const projectsWithPrice = radarProjects.filter((project) => typeof marketData[project.id]?.priceUsd === "number");
  const avgRisk =
    radarProjects.some((project) => project.risk === "High")
      ? "Mixed"
      : radarProjects.some((project) => project.risk === "Medium")
        ? "Medium"
        : "Low";
  const filteredProjects = radarProjects.filter((project) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      project.name.toLowerCase().includes(q) ||
      project.symbol.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q) ||
      project.categories.some((category) => category.toLowerCase().includes(q));
    const matchesCategory = categoryFilter === "All" || project.categories.includes(categoryFilter);
    const matchesStage = stageFilter === "All" || project.stage === stageFilter;
    const matchesRisk = riskFilter === "All" || project.risk === riskFilter;

    return matchesSearch && matchesCategory && matchesStage && matchesRisk;
  });

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStageFilter("All");
    setRiskFilter("All");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="rounded-3xl border border-white/15 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-cyan-100">Filters</h2>
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-slate-400 hover:text-cyan-200">
            Reset
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Project, token, category..."
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
          />
        </label>
        <FilterGroup
          title="Category"
          items={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterGroup
          title="Stage"
          items={["All", "New", "Growing", "Mature"]}
          value={stageFilter}
          onChange={setStageFilter}
        />
        <FilterGroup
          title="Risk"
          items={["All", "Low", "Medium", "High"]}
          value={riskFilter}
          onChange={setRiskFilter}
        />
        <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
          <p className="text-sm font-black text-cyan-100">Stay ahead</p>
          <p className="mt-1 text-xs text-cyan-100/75">
            Track high-potential Base projects before they become obvious.
          </p>
        </div>
      </aside>

      <main className="grid gap-4">
        <div>
          <h2 className="text-3xl font-black text-white md:text-4xl">Project Radar</h2>
          <p className="mt-1 text-sm text-slate-200/80">
            Discover useful Base projects with curated links, token prices, and live market signals.
          </p>
          <p className="mt-2 text-sm font-bold text-cyan-200">
            Showing {filteredProjects.length} of {radarProjects.length} tracked projects
          </p>
          {!marketError && updatedLabel ? (
            <p className="mt-2 text-xs text-slate-400">
              Last update: {updatedLabel}
            </p>
          ) : null}
          {marketError ? <p className="mt-2 text-sm text-amber-200">{marketError}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tracked Projects" value={String(radarProjects.length)} />
          <Metric label="Live Prices" value={isLoading ? "..." : String(projectsWithPrice.length)} />
          <Metric label="Avg Risk" value={avgRisk} />
          <Metric label="Visible Now" value={String(filteredProjects.length)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} market={marketData[project.id]} />
          ))}
        </div>
        {filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm text-amber-100">
            No projects match these filters yet. Reset filters or broaden the search.
          </div>
        ) : null}
      </main>

      <aside className="grid content-start gap-4">
        <SidePanel
          title="Bridge / Swap Picks"
          items={["Base Bridge", "Superbridge", "Relay", "Uniswap"]}
        />
        <SidePanel
          title="Lending Picks"
          items={["Aave", "Moonwell", "Morpho", "Seamless Protocol"]}
        />
      </aside>
    </div>
  );
}

function FilterGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-lg border px-3 py-1 text-xs font-bold ${
              value === item
                ? "border-cyan-200/60 bg-cyan-500/20 text-cyan-100"
                : "border-white/15 bg-white/5 text-slate-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/55 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/70">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function formatUsd(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatChange(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function Sparkline({ values, positive }: { values?: number[]; positive: boolean }) {
  if (!values || values.length < 2) {
    return <div className="h-8 rounded-xl bg-white/5" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 100,
    y: 28 - ((value - min) / range) * 24,
  }));
  const path = points.reduce((d, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

    const prev = points[index - 1];
    const controlX1 = prev.x + (point.x - prev.x) / 2;
    const controlX2 = point.x - (point.x - prev.x) / 2;
    return `${d} C ${controlX1.toFixed(2)} ${prev.y.toFixed(2)}, ${controlX2.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");

  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full overflow-visible rounded-xl bg-white/5">
      <path
        d={path}
        fill="none"
        stroke={positive ? "#34d399" : "#fb7185"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function ProjectCard({ project, market }: { project: RadarProject; market?: RadarMarketData }) {
  const change24h = market?.change24h ?? null;
  const positive = (change24h ?? 0) >= 0;
  const hasLiveMarket = typeof market?.priceUsd === "number";

  return (
    <article className="rounded-3xl border border-white/15 bg-slate-950/55 p-4">
      <div className="flex items-start gap-3">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          aria-label={`${project.name} website`}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${project.accent} transition hover:scale-105`}
        >
          <Image
            src={project.iconUrl}
            alt=""
            role="presentation"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg"
            referrerPolicy="no-referrer"
            unoptimized
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <a
                href={project.website}
                target="_blank"
                rel="noreferrer"
                className="font-black text-white underline-offset-4 hover:text-cyan-200 hover:underline"
              >
                {project.name}
              </a>
              <p className="text-xs font-bold text-cyan-200">{project.symbol}</p>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                project.risk === "Low"
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                  : project.risk === "Medium"
                    ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
                    : "border-rose-300/30 bg-rose-400/10 text-rose-200"
              }`}
            >
              {project.risk}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-200/75">{project.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.categories.map((tag) => (
          <span key={tag} className="rounded-lg border border-violet-300/25 bg-violet-500/10 px-2 py-1 text-xs text-violet-100">
            {tag}
          </span>
        ))}
      </div>
      {hasLiveMarket ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/5 p-2">
              <p className="text-slate-400">Price</p>
              <p className="font-black text-white">{formatUsd(market?.priceUsd)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <p className="text-slate-400">24h</p>
              <p className={`font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {formatChange(change24h)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <p className="text-slate-400">Liquidity</p>
              <p className="font-black text-white">{formatUsd(market?.liquidityUsd)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2">
              <p className="text-slate-400">Vol 24h</p>
              <p className="font-black text-white">{formatUsd(market?.volume24h)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Sparkline values={market?.sparkline} positive={positive} />
            <p className="mt-1 text-[10px] text-slate-500">
              Sparkline shape is illustrative (from 24h % when granular candles are unavailable).
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <p className="font-bold text-slate-100">
            {project.tokenAddress ? "Base market data unavailable" : "No native Base token tracked"}
          </p>
          <p className="mt-1 text-slate-400">
            {project.tokenAddress
              ? "DexScreener has no liquid Base pair for this token yet."
              : "This is a protocol/app listing, so Radar shows links and category signals instead of price stats."}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
        >
          Website
        </a>
        {project.tokenAddress || project.baseScanUrl ? (
          <a
            href={project.tokenAddress ? `https://basescan.org/token/${project.tokenAddress}` : project.baseScanUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
          >
            BaseScan
          </a>
        ) : null}
        {project.x ? (
          <a
            href={project.x}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
          >
            X
          </a>
        ) : null}
        {market?.pairUrl ? (
          <a
            href={market.pairUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
          >
            Chart
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SidePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-white">{title}</h2>
        <a
          href="https://www.base.org/ecosystem"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-cyan-200 underline decoration-cyan-500/40"
        >
          View all
        </a>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => {
          const project = radarProjects.find((p) => p.name === item);
          const content = (
            <>
              <span className="text-sm font-bold text-slate-100">{item}</span>
              <span className="text-xs text-cyan-200">{String(index + 1).padStart(2, "0")}</span>
            </>
          );

          return project ? (
            <a
              key={item}
              href={project.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 transition hover:bg-cyan-500/10"
            >
              {content}
            </a>
          ) : (
            <div key={item} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

