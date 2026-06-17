"use client";

import Link from "next/link";
import { RadarProjectCard } from "@/components/RadarProjectCard";
import { RadarProjectIcon } from "@/components/RadarProjectIcon";
import { Suspense, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { BaseAnalyticsPanel } from "@/components/BaseAnalyticsPanel";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";
import { useCommandPalette } from "@/components/CommandPalette";
import { GuardPanel } from "@/components/GuardPanel";
import { TxLensPanel } from "@/components/TxLensPanel";
import { HomeHubPanel } from "@/components/HomeHubPanel";
import { OnchainScorePanel } from "@/components/OnchainScorePanel";
import { SwapBridgePanel } from "@/components/SwapBridgePanel";
import { TokenLauncherPanel } from "@/components/TokenLauncherPanel";
import { VerifyDropPanel } from "@/components/VerifyDropPanel";
import { WalletPortfolioPanel } from "@/components/WalletPortfolioPanel";
import { Grid646GamePanel } from "@/components/Grid646GamePanel";
import { Battleship10GamePanel } from "@/components/Battleship10GamePanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { ReflectVoidBackdrop } from "@/components/reflect/ReflectVoidBackdrop";
import { ReflectHero } from "@/components/reflect/ReflectHero";
import { ReflectLandingPage } from "@/components/reflect/ReflectLandingPage";
import { ReflectNavPill } from "@/components/reflect/ReflectNavPill";
import { ReflectProductFrame } from "@/components/reflect/ReflectProductFrame";
import { OS_EMBED_TAB_GROUPS } from "@/lib/baseAppEmbedNav";
import { OS_TAB_GROUPS } from "@/lib/osTabGroups";
import { reflectNavTabIds } from "@/lib/reflectModules";
import { OS_TAB_META, tabFromSearchParam, type OsTabId } from "@/lib/osTabs";
import { parseAddressSearchParam, tabSupportsAddressParam, tabSupportsRoomParam } from "@/lib/osUrlParams";
import { useBaseAppEmbed } from "@/hooks/useBaseAppEmbed";
import { useRadarFavorites } from "@/hooks/useRadarFavorites";
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
    <div className="relative z-10 min-h-screen px-4 py-8">
      <div className="mx-auto max-w-[920px] animate-pulse space-y-6">
        <div className="mx-auto h-12 w-full max-w-xl rounded-full bg-white/5" />
        <div className="mx-auto h-32 max-w-lg rounded-2xl bg-white/5" />
        <div className="h-72 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

function BaseOsShellInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open: openCommandPalette } = useCommandPalette();
  const isEmbed = useBaseAppEmbed();

  const activeTab = tabFromSearchParam(searchParams.get("tab"));
  const deepLinkAddress = parseAddressSearchParam(searchParams.get("address"));
  const deepLinkAddressRaw = searchParams.get("address");
  const navTabIds = reflectNavTabIds(isEmbed ? OS_EMBED_TAB_GROUPS : OS_TAB_GROUPS);
  const { address } = useAccount();
  const activeMeta = useMemo(
    () => OS_TAB_META.find((tab) => tab.id === activeTab),
    [activeTab]
  );
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function setActiveTab(tab: OsTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (!tabSupportsAddressParam(tab)) {
      params.delete("address");
    }
    if (!tabSupportsRoomParam(tab)) {
      params.delete("room");
    }
    const query = params.toString();
    const href = query ? `/?${query}` : "/";
    if (pathname === "/") {
      router.replace(href, { scroll: false });
    } else {
      router.push(href);
    }
  }

  const activeIndex = navTabIds.indexOf(activeTab);

  function focusTabAt(rawIndex: number) {
    const len = navTabIds.length;
    const next = ((rawIndex % len) + len) % len;
    const id = navTabIds[next];
    setActiveTab(id);
    requestAnimationFrame(() => {
      tabButtonRefs.current[next]?.focus();
    });
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTabAt(activeIndex >= 0 ? activeIndex + 1 : 0);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTabAt(activeIndex >= 0 ? activeIndex - 1 : 0);
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      focusTabAt(navTabIds.length - 1);
    }
  }

  return (
    <>
      <ReflectVoidBackdrop staticMode={isEmbed} />
      <main className={`relative z-10 min-h-screen ${isEmbed ? "pb-6" : "pb-4"}`}>
        <ReflectNavPill
          activeTab={activeTab}
          onSelect={setActiveTab}
          onKeyDown={handleTabKeyDown}
          tabButtonRefs={tabButtonRefs}
          onOpenCommandPalette={openCommandPalette}
          isEmbed={isEmbed}
          tabGroups={isEmbed ? OS_EMBED_TAB_GROUPS : OS_TAB_GROUPS}
        />

        <ReflectHero
          activeTab={activeTab}
          activeLabel={activeMeta?.label ?? "Base OS"}
          isEmbed={isEmbed}
        />

        <div className="mx-auto mt-8 max-w-[min(100%,1100px)] px-4">
          <ReflectProductFrame
            id={`base-os-panel-${activeTab}`}
            variant={activeTab === "home" ? "hero" : "default"}
            role="tabpanel"
            aria-labelledby={`base-os-tab-${activeTab}`}
            tabIndex={0}
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
                    className="text-sm font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)] underline-offset-4 hover:text-[var(--color-lilac-white)]"
                  >
                    Open your tip page
                  </Link>
                ) : null}
                <div className="flex justify-center">
                  <BaseBuilderApp />
                </div>
              </div>
            ) : null}
            {activeTab === "drop" ? <VerifyDropPanel /> : null}
            {activeTab === "analytics" ? <BaseAnalyticsPanel /> : null}
            {activeTab === "radar" ? <RadarPanel /> : null}
            {activeTab === "watch" ? <WatchlistPanel /> : null}
            {activeTab === "lens" ? <TxLensPanel /> : null}
            {activeTab === "guard" ? (
              <GuardPanel initialAddress={deepLinkAddress ?? deepLinkAddressRaw} />
            ) : null}
            {activeTab === "score" ? (
              <OnchainScorePanel initialAddress={deepLinkAddress ?? deepLinkAddressRaw} />
            ) : null}
            {activeTab === "portfolio" ? (
              <WalletPortfolioPanel initialAddress={deepLinkAddress ?? deepLinkAddressRaw} />
            ) : null}
          </ReflectProductFrame>
        </div>

        {activeTab === "home" && !isEmbed ? (
          <ReflectLandingPage setActiveTab={setActiveTab} onOpenCommandPalette={openCommandPalette} />
        ) : !isEmbed ? (
          <div className="mx-auto max-w-[min(100%,720px)] px-4 pb-8 pt-4 text-center">
            <p className="text-[14px] text-[var(--color-fog)]">
              Full Reflect landing with module grid is on{" "}
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className="font-medium text-[var(--color-lavender-accent)] hover:underline"
              >
                Home
              </button>
              . Scroll sections appear below the product frame there.
            </p>
          </div>
        ) : null}
      </main>
    </>
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favorites = useRadarFavorites();

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
    setFavoritesOnly(false);
  }

  const favoriteProjects = useMemo(
    () =>
      favorites.favoriteIds
        .map((id) => radarProjects.find((project) => project.id === id))
        .filter((project): project is RadarProject => Boolean(project)),
    [favorites.favoriteIds]
  );

  const sortedFilteredProjects = useMemo(() => {
    const matched = filteredProjects.filter((project) => !favoritesOnly || favorites.favoriteSet.has(project.id));
    if (favoritesOnly) return matched;
    return [...matched].sort((a, b) => {
      const aFav = favorites.favoriteSet.has(a.id) ? 0 : 1;
      const bFav = favorites.favoriteSet.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });
  }, [filteredProjects, favorites.favoriteSet, favoritesOnly]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(190px,210px)_minmax(0,1fr)]">
      <aside className="os-panel p-4 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="os-display text-base font-semibold text-amber-100">Filters</h2>
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
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Collection</p>
          <ul className="mt-1.5 divide-y divide-white/[0.06] rounded-md border border-white/[0.07] bg-black/30">
            <li>
              <button
                type="button"
                onClick={() => setFavoritesOnly(false)}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm transition first:rounded-t-md ${
                  !favoritesOnly
                    ? "border-l-2 border-amber-400/70 bg-violet-500/15 text-amber-50"
                    : "text-slate-300 hover:bg-white/[0.04]"
                }`}
              >
                <span>All apps</span>
                {!favoritesOnly ? (
                  <span className="shrink-0 text-xs text-cyan-300/90" aria-hidden>
                    ●
                  </span>
                ) : null}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setFavoritesOnly(true)}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm transition last:rounded-b-md ${
                  favoritesOnly
                    ? "border-l-2 border-amber-400/70 bg-violet-500/15 text-amber-50"
                    : "text-slate-300 hover:bg-white/[0.04]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-300" aria-hidden>
                    ★
                  </span>
                  Favorites
                </span>
                <span className="shrink-0 tabular-nums text-xs text-slate-500">{favoriteProjects.length}</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <main className="grid content-start gap-4 self-start">
        <div>
          <p className="os-eyebrow text-[var(--color-fog)]">Explore</p>
          <h2 className="os-display mt-2 text-2xl text-[var(--color-lilac-white)] md:text-3xl">Project Radar</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ash)]">Projects we like, with links and prices when available.</p>
          <p className="mt-2 text-[13px] font-medium text-[var(--color-lavender-accent)]">
            {sortedFilteredProjects.length} / {radarProjects.length} projects
            {favoriteProjects.length > 0 ? (
              <span className="ml-2 font-medium text-amber-200/90">· {favoriteProjects.length} starred</span>
            ) : null}
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
          <Metric label="On screen" value={String(sortedFilteredProjects.length)} />
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
          {sortedFilteredProjects.map((project) => (
            <RadarProjectCard
              key={project.id}
              project={project}
              market={marketData[project.id]}
              isFavorite={favorites.isFavorite(project.id)}
              onToggleFavorite={() => favorites.toggle(project.id)}
            />
          ))}
        </div>
        {sortedFilteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(147,130,255,0.2)] bg-[rgba(16,9,58,0.4)] p-5 text-sm text-[var(--color-ash)]">
            {favoritesOnly
              ? "No favorites yet — tap ★ on any app to pin it here."
              : "Nothing matches — try Reset or a shorter search."}
          </div>
        ) : null}

        <RadarFavoritesPanel
          projects={favoriteProjects}
          marketData={marketData}
          onShowAll={() => setFavoritesOnly(true)}
          onToggleFavorite={favorites.toggle}
        />
      </main>
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
                      ? "border-l-2 border-amber-400/70 bg-violet-500/15 text-amber-50"
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
    <div className="os-metric-tile px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-fog)]">{label}</p>
      <p className="mt-1 text-base font-medium tabular-nums text-[var(--color-lilac-white)]">{value}</p>
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

function RadarFavoritesPanel({
  projects,
  marketData,
  onShowAll,
  onToggleFavorite,
}: {
  projects: RadarProject[];
  marketData: Record<string, RadarMarketData>;
  onShowAll: () => void;
  onToggleFavorite: (id: string) => boolean;
}) {
  return (
    <div className="reflect-feature-card p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[rgba(145,142,160,0.1)] pb-3">
        <h2 className="os-display text-[15px] text-[var(--color-lilac-white)]">Favorites</h2>
        {projects.length > 0 ? (
          <button
            type="button"
            onClick={onShowAll}
            className="shrink-0 text-[11px] font-medium text-[var(--color-lavender-accent)] underline decoration-[rgba(147,130,255,0.35)]"
          >
            Show in grid
          </button>
        ) : null}
      </div>
      {projects.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-fog)]">
          Tap <span className="text-[var(--color-lavender-accent)]">☆</span> on any app to pin it here.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const price = marketData[project.id]?.priceUsd;
            return (
              <li
                key={project.id}
                className="flex items-center gap-2 rounded-[5px] border border-[rgba(145,142,160,0.1)] bg-[rgba(3,0,20,0.35)] p-2"
              >
                <a
                  href={project.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2 transition hover:opacity-90"
                >
                  <RadarProjectIcon iconUrl={project.iconUrl} accent={project.accent} size="list" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-[var(--color-lilac-white)]">{project.name}</span>
                    <span className="block text-[11px] text-[var(--color-fog)]">
                      {typeof price === "number" ? formatUsd(price) : project.symbol}
                    </span>
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(project.id)}
                  aria-label={`Remove ${project.name} from favorites`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] border border-[rgba(147,130,255,0.35)] text-sm text-[var(--color-lavender-accent)]"
                >
                  ★
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

