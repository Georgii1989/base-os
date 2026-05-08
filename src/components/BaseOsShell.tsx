"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";
import { useCommandPalette } from "@/components/CommandPalette";
import { GuardPanel } from "@/components/GuardPanel";
import { TxLensPanel } from "@/components/TxLensPanel";
import { WalletCardPanel } from "@/components/WalletCardPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { OS_TAB_META, tabFromSearchParam, type OsTabId } from "@/lib/osTabs";
import { radarProjects, type RadarProject } from "@/lib/radarProjects";

type TabId = OsTabId;

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

  const activeIndex = OS_TAB_META.findIndex((tab) => tab.id === activeTab);

  function focusTabAt(rawIndex: number) {
    const len = OS_TAB_META.length;
    const next = ((rawIndex % len) + len) % len;
    const id = OS_TAB_META[next].id;
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
      focusTabAt(OS_TAB_META.length - 1);
    }
  }

  return (
    <section className="relative z-10 w-full max-w-7xl rounded-3xl border border-white/15 bg-black/35 p-4 text-white shadow-[0_0_60px_rgba(76,29,149,0.45)] backdrop-blur-xl md:p-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">
            Base hub
          </p>
          <h1 className="mt-1 text-3xl font-black text-fuchsia-100 md:text-5xl">Base OS</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200/80">
            Tips, app picks, wallet checks — all in one place.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
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
          <div className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-3 text-right sm:w-auto sm:text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Open now</p>
            <p className="text-lg font-black text-cyan-100">{activeMeta?.label}</p>
          </div>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="Base OS modules"
        className="mt-4 flex gap-2 overflow-x-auto border-b border-[#6b2248]/70 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onKeyDown={handleTabKeyDown}
      >
        {OS_TAB_META.map((tab, index) => (
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
            className={`relative shrink-0 rounded-lg border px-3 py-2.5 text-left transition sm:min-w-[5.5rem] sm:px-4 ${
              activeTab === tab.id
                ? "border-[#b64072] bg-[#3a0d26]/70 text-[#ffd3e6] shadow-[0_0_16px_rgba(182,64,114,0.35)]"
                : "border-[#5c1d3f]/70 bg-[#210818]/45 text-slate-300 hover:border-[#8b2f58] hover:text-[#ffd3e6]"
            }`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {tab.eyebrow}
            </span>
            <span className="mt-0.5 block text-sm font-bold">{tab.label}</span>
            {activeTab === tab.id ? (
              <span
                className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t-sm bg-gradient-to-r from-[#f08ab4] to-[#b64072]"
                aria-hidden
              />
            ) : null}
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
                Open your tip page
              </Link>
            ) : null}
            <div className="flex justify-center">
              <BaseBuilderApp />
            </div>
          </div>
        ) : null}
        {activeTab === "radar" ? <RadarPanel /> : null}
        {activeTab === "watch" ? <WatchlistPanel /> : null}
        {activeTab === "lens" ? <TxLensPanel /> : null}
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
      title: "Tips & badge",
      text: "Send a tip, get a supporter badge, see who else joined.",
      cta: "Open tips",
    },
    {
      tab: "radar",
      title: "Project radar",
      text: "Hand-picked Base apps with links and live prices.",
      cta: "Browse apps",
    },
    {
      tab: "watch",
      title: "Tracked wallets",
      text: "Save addresses. We show ETH balance and activity. Data stays in this browser only.",
      cta: "Open tracker",
    },
    {
      tab: "lens",
      title: "Transaction preview",
      text: "Try a transaction without sending it. See if it would work and how much gas it might use.",
      cta: "Open preview",
    },
    {
      tab: "guard",
      title: "Token permissions",
      text: "See how much access you gave apps to your tokens. Revoke on a trusted site if needed.",
      cta: "Open guard",
    },
    {
      tab: "wallet",
      title: "Your wallet",
      text: "Your address, quick links, and disconnect.",
      cta: "Open wallet",
    },
  ];

  return (
    <div className="grid gap-4">
      {connectedAddress ? (
        <div className="flex flex-col justify-between gap-3 rounded-3xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-200/80">Connected</p>
            <p className="mt-1 text-sm text-fuchsia-100/90">Your public tip page on Base OS.</p>
          </div>
          <Link
            href={`/${connectedAddress}`}
            className="shrink-0 rounded-2xl border border-fuchsia-200/50 bg-fuchsia-500/20 px-4 py-2 text-center text-sm font-black text-fuchsia-50"
          >
            Tip profile →
          </Link>
        </div>
      ) : null}
      <Link
        href="/safety"
        className="group relative block overflow-hidden rounded-[1.85rem] border border-teal-300/35 bg-gradient-to-br from-teal-500/14 via-black/65 to-black/85 p-6 shadow-[0_0_55px_rgba(45,212,191,0.12)] transition hover:border-cyan-300/70 hover:shadow-[0_0_60px_rgba(34,211,238,0.15)] md:p-8"
      >
        <span className="pointer-events-none absolute -right-8 top-6 h-32 w-32 rounded-full bg-cyan-400/12 blur-[50px]" />
        <span className="pointer-events-none absolute bottom-[-20%] left-[-5%] h-44 w-44 rounded-full bg-fuchsia-500/10 blur-[70px]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-teal-200/90">
              No wallet needed
            </p>
            <h2 className="mt-3 bg-gradient-to-r from-teal-100 via-white to-fuchsia-200 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
              Look up any address
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-[15px]">
              Paste a Base address. We show if it’s a wallet or a contract, balance, and links to explore more. Share the
              page with anyone.
            </p>
          </div>
          <span className="relative inline-flex items-center gap-3 self-start rounded-2xl border border-white/22 bg-black/65 px-5 py-3 text-sm font-black uppercase tracking-[0.26em] text-white transition group-hover:border-cyan-300/85 group-hover:text-cyan-50 md:self-center md:text-xs">
            Open lookup
            <span aria-hidden className="text-lg leading-none text-cyan-200">
              ↗
            </span>
          </span>
        </div>
      </Link>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">Price</p>
              <p className="font-bold text-white">{formatUsd(market?.priceUsd)}</p>
            </div>
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">24h</p>
              <p className={`font-bold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {formatChange(change24h)}
              </p>
            </div>
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">Liquidity</p>
              <p className="font-bold text-white">{formatUsd(market?.liquidityUsd)}</p>
            </div>
            <div className="bg-black/30 p-2.5">
              <p className="text-slate-500">24h volume</p>
              <p className="font-bold text-white">{formatUsd(market?.volume24h)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Sparkline values={market?.sparkline} positive={positive} />
            <p className="mt-1 text-[10px] text-slate-500">Simple trend line · not live trading data.</p>
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

