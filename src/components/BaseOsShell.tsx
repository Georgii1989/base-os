"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";
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
  const activeMeta = useMemo(() => tabs.find((tab) => tab.id === activeTab), [activeTab]);

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

      <nav className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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

      <div className="mt-5">
        {activeTab === "home" ? <HomePanel setActiveTab={setActiveTab} /> : null}
        {activeTab === "tip" ? (
          <div className="flex justify-center">
            <BaseBuilderApp />
          </div>
        ) : null}
        {activeTab === "radar" ? <RadarPanel /> : null}
        {activeTab === "guard" ? <ComingSoonPanel title="Allowance Guard" /> : null}
        {activeTab === "wallet" ? <ComingSoonPanel title="Wallet Card" /> : null}
      </div>
    </section>
  );
}

function HomePanel({ setActiveTab }: { setActiveTab: (tab: TabId) => void }) {
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
      text: "Discover useful Base projects with curated signals and safety context.",
      cta: "Explore Radar",
    },
    {
      tab: "guard",
      title: "Allowance Guard",
      text: "A future safety module for checking risky approvals and unlimited permits.",
      cta: "Preview Guard",
    },
  ];

  return (
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
  );
}

function RadarPanel() {
  const [marketData, setMarketData] = useState<Record<string, RadarMarketData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketData() {
      try {
        const response = await fetch("/api/radar");
        if (!response.ok) throw new Error("market-data");
        const payload = (await response.json()) as { data?: RadarMarketData[] };
        if (cancelled) return;

        const next: Record<string, RadarMarketData> = {};
        for (const item of payload.data ?? []) {
          next[item.id] = item;
        }
        setMarketData(next);
        setMarketError(null);
      } catch {
        if (!cancelled) {
          setMarketError("Live market data is temporarily unavailable.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMarketData();
    const timer = setInterval(() => {
      void loadMarketData();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const projectsWithPrice = radarProjects.filter((project) => marketData[project.id]?.priceUsd !== null);
  const avgRisk =
    radarProjects.some((project) => project.risk === "High")
      ? "Mixed"
      : radarProjects.some((project) => project.risk === "Medium")
        ? "Medium"
        : "Low";

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="rounded-3xl border border-white/15 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-cyan-100">Filters</h2>
          <span className="text-xs text-slate-400">Reset</span>
        </div>
        <FilterGroup title="Category" items={["DeFi", "NFT", "Social", "Infra", "AI", "Gaming"]} />
        <FilterGroup title="Stage" items={["New", "Growing", "Mature"]} />
        <FilterGroup title="Risk" items={["Low", "Medium", "High"]} />
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
          {marketError ? <p className="mt-2 text-sm text-amber-200">{marketError}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tracked Projects" value={String(radarProjects.length)} />
          <Metric label="Live Prices" value={isLoading ? "..." : String(projectsWithPrice.length)} />
          <Metric label="Avg Risk" value={avgRisk} />
          <Metric label="Hot Category" value="DeFi" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {radarProjects.map((project) => (
            <ProjectCard key={project.id} project={project} market={marketData[project.id]} />
          ))}
        </div>
      </main>

      <aside className="grid content-start gap-4">
        <SidePanel
          title="Weekly Picks"
          items={["Aerodrome", "Virtuals", "Moonwell", "Degen"]}
        />
        <SidePanel
          title="Recently Added"
          items={["Clanker", "Brett", "Moonwell", "Virtuals"]}
        />
      </aside>
    </div>
  );
}

function FilterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={item}
            className={`rounded-lg border px-3 py-1 text-xs font-bold ${
              index === 0
                ? "border-cyan-200/60 bg-cyan-500/20 text-cyan-100"
                : "border-white/15 bg-white/5 text-slate-200"
            }`}
          >
            {item}
          </span>
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

  return (
    <article className="rounded-3xl border border-white/15 bg-slate-950/55 p-4">
      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${project.accent}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-white">{project.name}</h3>
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
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={project.website}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
        >
          Website
        </a>
        <a
          href={`https://basescan.org/token/${project.tokenAddress}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
        >
          BaseScan
        </a>
        <a
          href={project.x}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
        >
          X
        </a>
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
        <span className="text-xs font-bold text-cyan-200">View all</span>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <span className="text-sm font-bold text-slate-100">{item}</span>
            <span className="text-xs text-cyan-200">{String(index + 1).padStart(2, "0")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoonPanel({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-slate-950/55 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-200/80">Coming soon</p>
      <h2 className="mt-2 text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-slate-200/80">
        This module is planned for the Base OS suite. We will build it after the Radar MVP is stable.
      </p>
    </div>
  );
}
