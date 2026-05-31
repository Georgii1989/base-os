"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { BaseOsHeroVisual } from "@/components/BaseOsHeroVisual";
import { BaseAnalyticsPanel } from "@/components/BaseAnalyticsPanel";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";
import { useCommandPalette } from "@/components/CommandPalette";
import { GuardPanel } from "@/components/GuardPanel";
import { TxLensPanel } from "@/components/TxLensPanel";
import { HomeHubPanel } from "@/components/HomeHubPanel";
import { OnchainScorePanel } from "@/components/OnchainScorePanel";
import { SwapBridgePanel } from "@/components/SwapBridgePanel";
import { TokenLauncherPanel } from "@/components/TokenLauncherPanel";
import { WalletConnectControl } from "@/components/WalletConnectControl";
import { WalletPortfolioPanel } from "@/components/WalletPortfolioPanel";
import { Grid646GamePanel } from "@/components/Grid646GamePanel";
import { Battleship10GamePanel } from "@/components/Battleship10GamePanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { BaseOsNavPulse } from "@/components/BaseOsNavPulse";
import { OsGroupedNav } from "@/components/OsGroupedNav";
import { OS_PRIMARY_TAB_IDS } from "@/lib/osTabGroups";
import { OS_TAB_META, tabFromSearchParam, type OsTabId } from "@/lib/osTabs";
import { radarProjects, type RadarProject } from "@/lib/radarProjects";

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
  return (
    <Suspense fallback={<OsShellFallback />}>
      <BaseOsShellInner />
    </Suspense>
  );
}

function OsShellFallback() {
  return (
    <section className="relative z-10 w-full max-w-7xl rounded-3xl border border-white/15 bg-black/35 p-8 text-white shadow-[0_0_60px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <div className="animate-pulse space-y-6">
        <div className="h-28 rounded-3xl bg-white/5" />
        <div className="flex flex-wrap gap-2">
          <div className="h-12 w-32 rounded-2xl bg-white/10" />
          <div className="h-12 w-36 rounded-2xl bg-white/10" />
          <div className="h-12 w-36 rounded-2xl bg-white/10" />
        </div>
        <div className="h-72 rounded-3xl bg-white/5" />
      </div>
    </section>
  );
}

function BaseOsShellInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open: openCommandPalette } = useCommandPalette();

  const activeTab = tabFromSearchParam(searchParams.get("tab"));
  const { address } = useAccount();
  const activeMeta = useMemo(
    () => OS_TAB_META.find((tab) => tab.id === activeTab),
    [activeTab]
  );
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function setActiveTab(tab: OsTabId) {
    if (pathname === "/") {
      router.replace(`/?tab=${tab}`, { scroll: false });
    } else {
      router.push(`/?tab=${tab}`);
    }
  }

  const activeIndex = OS_PRIMARY_TAB_IDS.indexOf(activeTab);

  function focusTabAt(rawIndex: number) {
    const len = OS_PRIMARY_TAB_IDS.length;
    const next = ((rawIndex % len) + len) % len;
    const id = OS_PRIMARY_TAB_IDS[next];
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
      focusTabAt(OS_PRIMARY_TAB_IDS.length - 1);
    }
  }

  return (
    <section className="relative z-10 w-full max-w-7xl overflow-hidden rounded-3xl border border-white/15 bg-black/35 p-4 text-white shadow-[0_0_80px_rgba(76,29,149,0.55),0_0_120px_rgba(34,211,238,0.08)] backdrop-blur-xl md:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
        aria-hidden
      />
      <header className="relative flex flex-col gap-4 border-b border-white/10 pb-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
        <div className="md:justify-self-start">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">
            Base OS
          </p>
          <h1 className="mt-1 text-3xl font-black text-fuchsia-100 md:text-5xl">Base OS</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200/80">
            One system for Base — briefing, trade, build, and protect your wallet.
          </p>
        </div>

        <BaseOsHeroVisual className="h-28 w-48 sm:h-32 sm:w-56 lg:h-36 lg:w-64" />

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:min-w-[12rem] sm:items-end md:justify-self-end">
          <WalletConnectControl />
          <button
            type="button"
            title="⌘ K or Ctrl K"
            onClick={() => openCommandPalette()}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-300/35 bg-black/55 px-4 py-3 text-xs font-black uppercase tracking-[0.35em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/85 hover:bg-cyan-500/15 hover:shadow-[0_0_42px_rgba(34,211,238,0.18)] sm:w-auto sm:justify-center"
          >
            <span>Quick menu</span>
            <kbd className="hidden rounded-xl border border-white/15 bg-black/70 px-2 py-1 font-mono text-[11px] font-bold text-slate-200 sm:inline">
              ⌘K
            </kbd>
          </button>
          <div className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-3 text-right sm:w-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Open now</p>
            <p className="text-lg font-black text-cyan-100">{activeMeta?.label}</p>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 border-b border-[#6b2248]/70 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
        <OsGroupedNav
          activeTab={activeTab}
          onSelect={setActiveTab}
          onKeyDown={handleTabKeyDown}
          tabButtonRefs={tabButtonRefs}
        />
        <BaseOsNavPulse activeTab={activeTab} onSelect={setActiveTab} />
      </div>

      <div
        id={`base-os-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`base-os-tab-${activeTab}`}
        tabIndex={0}
        className="mt-5 outline-none"
      >
        {activeTab === "home" ? (
          <HomeHubPanel
            connectedAddress={address}
            setActiveTab={setActiveTab}
            onOpenCommandPalette={openCommandPalette}
          />
        ) : null}
        {activeTab === "launch" ? <TokenLauncherPanel /> : null}
        {activeTab === "swap" ? <SwapBridgePanel /> : null}
        {activeTab === "game" ? <Grid646GamePanel /> : null}
        {activeTab === "battleship" ? <Battleship10GamePanel /> : null}
        {activeTab === "tip" ? (
          <div className="flex flex-col items-center gap-4">
            {address ? (
              <Link
                href={`/${address}`}
                className="text-sm font-bold text-fuchsia-200 underline decoration-fuchsia-500/40 underline-offset-4 hover:text-fuchsia-100"
              >
                Open your tip page
              </Link>
            ) : null}
            <div className="flex justify-center">
              <BaseBuilderApp />
            </div>
          </div>
        ) : null}
        {activeTab === "analytics" ? <BaseAnalyticsPanel /> : null}
        {activeTab === "radar" ? <RadarPanel /> : null}
        {activeTab === "watch" ? <WatchlistPanel /> : null}
        {activeTab === "lens" ? <TxLensPanel /> : null}
        {activeTab === "guard" ? <GuardPanel /> : null}
        {activeTab === "score" ? <OnchainScorePanel /> : null}
        {activeTab === "portfolio" ? <WalletPortfolioPanel /> : null}
      </div>
    </section>
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

  const marketError = isError ? "Prices unavailable right now. Try again later." : null;
  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
    : dataUpdatedAt
      ? new Date(dataUpdatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : null;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of radarProjects) {
      for (const category of project.categories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return counts;
  }, []);

  const categoryOptions = useMemo(() => {
    const labels = Array.from(categoryCounts.entries())
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label]) => label);
    return ["All", ...labels];
  }, [categoryCounts]);

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<RadarProject["stage"], number>> = {};
    for (const project of radarProjects) {
      counts[project.stage] = (counts[project.stage] ?? 0) + 1;
    }
    return counts;
  }, []);

  const stageOptions = useMemo(() => {
    const order: RadarProject["stage"][] = ["New", "Growing", "Mature"];
    return ["All", ...order.filter((stage) => (stageCounts[stage] ?? 0) > 0)];
  }, [stageCounts]);

  const riskCounts = useMemo(() => {
    const counts: Partial<Record<RadarProject["risk"], number>> = {};
    for (const project of radarProjects) {
      counts[project.risk] = (counts[project.risk] ?? 0) + 1;
    }
    return counts;
  }, []);

  const riskOptions = useMemo(() => {
    const order: RadarProject["risk"][] = ["Low", "Medium", "High"];
    return ["All", ...order.filter((risk) => (riskCounts[risk] ?? 0) > 0)];
  }, [riskCounts]);

  const resolvedCategory = useMemo(() => {
    if (categoryFilter === "All" || categoryOptions.includes(categoryFilter)) return categoryFilter;
    return "All";
  }, [categoryFilter, categoryOptions]);

  const resolvedStage = useMemo(() => {
    if (stageFilter === "All" || stageOptions.includes(stageFilter)) return stageFilter;
    return "All";
  }, [stageFilter, stageOptions]);

  const resolvedRisk = useMemo(() => {
    if (riskFilter === "All" || riskOptions.includes(riskFilter)) return riskFilter;
    return "All";
  }, [riskFilter, riskOptions]);

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
    const matchesCategory = resolvedCategory === "All" || project.categories.includes(resolvedCategory);
    const matchesStage = resolvedStage === "All" || project.stage === resolvedStage;
    const matchesRisk = resolvedRisk === "All" || project.risk === resolvedRisk;

    return matchesSearch && matchesCategory && matchesStage && matchesRisk;
  });

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStageFilter("All");
    setRiskFilter("All");
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-cyan-100">Filters</h2>
          <button type="button" onClick={resetFilters} className="text-xs font-semibold text-slate-500 hover:text-cyan-200">
            Reset
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, symbol, tag…"
            className="mt-1.5 w-full border-b border-white/15 bg-transparent px-0 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70"
          />
        </label>
        <FilterList
          title="Category"
          items={categoryOptions}
          value={resolvedCategory}
          onChange={setCategoryFilter}
          collapsible
          expanded={categoriesOpen}
          onToggle={() => setCategoriesOpen((prev) => !prev)}
        />
        <FilterList
          title="Stage"
          items={stageOptions}
          value={resolvedStage}
          onChange={setStageFilter}
        />
        <FilterList title="Risk" items={riskOptions} value={resolvedRisk} onChange={setRiskFilter} />
      </aside>

      <main className="grid content-start gap-4 self-start">
        <div>
          <h2 className="text-3xl font-black text-white md:text-4xl">Project Radar</h2>
          <p className="mt-1 text-sm text-slate-200/80">Projects we like, with links and prices when available.</p>
          <p className="mt-2 text-sm font-bold text-cyan-200">
            {filteredProjects.length} / {radarProjects.length} projects
          </p>
          {!marketError && updatedLabel ? (
            <p className="mt-2 text-xs text-slate-400">
              Updated {updatedLabel}
            </p>
          ) : null}
          {marketError ? <p className="mt-2 text-sm text-amber-200">{marketError}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Metric label="Projects" value={String(radarProjects.length)} />
          <Metric label="With price" value={isLoading ? "…" : String(projectsWithPrice.length)} />
          <Metric label="Avg risk" value={avgRisk} />
          <Metric label="On screen" value={String(filteredProjects.length)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} market={marketData[project.id]} />
          ))}
        </div>
        {filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-amber-300/25 bg-amber-500/10 p-5 text-sm text-amber-100">
            Nothing matches — try Reset or a shorter search.
          </div>
        ) : null}
      </main>

      <aside className="grid content-start gap-4">
        <SidePanel
          title="Bridge & swap"
          items={["Base Bridge", "Superbridge", "Relay", "Uniswap"]}
        />
        <SidePanel
          title="Lending"
          items={["Aave", "Moonwell", "Morpho", "Seamless Protocol"]}
        />
      </aside>
    </div>
  );
}

function FilterList({
  title,
  items,
  value,
  onChange,
  collapsible = false,
  expanded = true,
  onToggle,
}: {
  title: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            className="rounded border border-[#7f2a52]/70 bg-[#2a0b1b]/60 px-1.5 py-0.5 text-xs text-[#f1aac9] transition hover:border-[#c14a7e] hover:text-[#ffd8e8]"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <ul className="mt-1.5 divide-y divide-white/[0.06] rounded-md border border-white/[0.07] bg-black/30">
          {items.map((item) => {
            const active = value === item;
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onChange(item)}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm transition first:rounded-t-md last:rounded-b-md ${
                    active
                      ? "border-l-2 border-[#d25b8f] bg-[#4a102d]/75 text-[#ffe1ee]"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="min-w-0 truncate">{item}</span>
                  {active ? (
                    <span className="shrink-0 text-xs text-cyan-300/90" aria-hidden>
                      ●
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-1.5 rounded-md border border-dashed border-white/[0.08] px-2.5 py-2 text-xs text-slate-500">
          Hidden
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.09] bg-black/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-white">{value}</p>
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

function ProjectCard({ project, market }: { project: RadarProject; market?: RadarMarketData }) {
  const change24h = market?.change24h ?? null;
  const positive = (change24h ?? 0) >= 0;
  const hasLiveMarket = typeof market?.priceUsd === "number";

  return (
    <article className="rounded-xl border border-white/12 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
              className={`shrink-0 border-l-2 px-2 py-0.5 text-xs font-semibold ${
                project.risk === "Low"
                  ? "border-emerald-400/70 text-emerald-200"
                  : project.risk === "Medium"
                    ? "border-amber-400/70 text-amber-200"
                    : "border-rose-400/70 text-rose-200"
              }`}
            >
              {project.risk}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-slate-300/90">{project.description}</p>
          <p className="mt-2 text-xs text-slate-500">{project.categories.join(" · ")}</p>
        </div>
      </div>
      {hasLiveMarket ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-white/[0.06] text-xs">
            <div className="bg-black/30 p-2.5 col-span-2">
              <p className="text-slate-500">24h change</p>
              <p className={`text-lg font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {formatChange(change24h)}
              </p>
            </div>
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">Price</p>
              <p className="font-bold text-white">{formatUsd(market?.priceUsd)}</p>
            </div>
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">Liquidity</p>
              <p className="font-bold text-white">{formatUsd(market?.liquidityUsd)}</p>
            </div>
            <div className="bg-black/30 p-2.5 col-span-2">
              <p className="text-slate-500">24h volume</p>
              <p className="font-bold text-white">{formatUsd(market?.volume24h)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 border border-white/[0.07] bg-black/25 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">
            {project.tokenAddress ? "No price data" : "No token price"}
          </p>
          <p className="mt-1 leading-relaxed">
            {project.tokenAddress
              ? "No active price feed for this token on Base yet."
              : "App listing — links only, no chart."}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-cyan-200/90 underline decoration-cyan-500/35 underline-offset-4 hover:text-cyan-100"
        >
          Website
        </a>
        {project.tokenAddress || project.baseScanUrl ? (
          <a
            href={project.tokenAddress ? `https://basescan.org/token/${project.tokenAddress}` : project.baseScanUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-cyan-200/90 underline decoration-cyan-500/35 underline-offset-4 hover:text-cyan-100"
          >
            BaseScan
          </a>
        ) : null}
        {project.x ? (
          <a
            href={project.x}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-cyan-200/90 underline decoration-cyan-500/35 underline-offset-4 hover:text-cyan-100"
          >
            X
          </a>
        ) : null}
        {market?.pairUrl ? (
          <a
            href={market.pairUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-cyan-200/90 underline decoration-cyan-500/35 underline-offset-4 hover:text-cyan-100"
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
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <a
          href="https://www.base.org/ecosystem"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-semibold text-cyan-300/90 underline decoration-cyan-500/35"
        >
          View all
        </a>
      </div>
      <ul className="mt-2 divide-y divide-white/[0.06]">
        {items.map((item, index) => {
          const project = radarProjects.find((p) => p.name === item);
          const row = (
            <>
              <span className="text-sm font-medium text-slate-100">{item}</span>
              <span className="tabular-nums text-xs text-slate-500">{String(index + 1).padStart(2, "0")}</span>
            </>
          );

          return (
            <li key={item}>
              {project ? (
                <a
                  href={project.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 py-2.5 transition hover:text-cyan-100"
                >
                  {row}
                </a>
              ) : (
                <div className="flex items-center justify-between gap-2 py-2.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

