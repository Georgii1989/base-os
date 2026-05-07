"use client";

import { useMemo, useState } from "react";
import { BaseBuilderApp } from "@/components/BaseBuilderApp";

type TabId = "home" | "tip" | "radar" | "guard" | "wallet";

const tabs: { id: TabId; label: string; eyebrow: string }[] = [
  { id: "home", label: "Home", eyebrow: "Overview" },
  { id: "tip", label: "Tip", eyebrow: "Support" },
  { id: "radar", label: "Radar", eyebrow: "Discover" },
  { id: "guard", label: "Guard", eyebrow: "Safety" },
  { id: "wallet", label: "Wallet Card", eyebrow: "Identity" },
];

const projectCards = [
  {
    name: "BlueDock",
    description: "Liquidity hub for Base-native assets with concentrated strategies.",
    tags: ["DeFi", "DEX", "Liquidity"],
    risk: "Low",
    accent: "from-blue-500 to-cyan-300",
  },
  {
    name: "AuroraSwap",
    description: "Next-gen AMM powering efficient swaps on Base.",
    tags: ["DeFi", "AMM", "Trading"],
    risk: "Low",
    accent: "from-violet-500 to-fuchsia-300",
  },
  {
    name: "BaseBuild",
    description: "Developer toolkit to deploy and scale apps on Base.",
    tags: ["Infra", "SDK", "Tools"],
    risk: "Low",
    accent: "from-emerald-500 to-cyan-300",
  },
  {
    name: "Pixel Park",
    description: "Social gaming world where creators and players own their moments.",
    tags: ["Gaming", "Social", "NFT"],
    risk: "Medium",
    accent: "from-pink-500 to-amber-300",
  },
  {
    name: "CipherAI",
    description: "AI copilot for onchain research and portfolio intelligence.",
    tags: ["AI", "Analytics", "DeFi"],
    risk: "Low",
    accent: "from-lime-500 to-emerald-300",
  },
  {
    name: "ZoraHub",
    description: "Explore, collect, and trade digital media on Base.",
    tags: ["NFT", "Marketplace", "Social"],
    risk: "Low",
    accent: "from-indigo-500 to-blue-300",
  },
];

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
            Discover useful Base projects with curated signals.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tracked Projects" value="128" />
          <Metric label="New This Week" value="14" />
          <Metric label="Avg Risk" value="Low" />
          <Metric label="Hot Category" value="DeFi" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectCards.map((project) => (
            <ProjectCard key={project.name} {...project} />
          ))}
        </div>
      </main>

      <aside className="grid content-start gap-4">
        <SidePanel
          title="Weekly Picks"
          items={["AuroraSwap", "BaseBuild", "CipherAI", "BlueDock"]}
        />
        <SidePanel
          title="Recently Added"
          items={["LoopFinance", "Mintify", "DataHive", "QuestBoard"]}
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

function ProjectCard({
  name,
  description,
  tags,
  risk,
  accent,
}: {
  name: string;
  description: string;
  tags: string[];
  risk: string;
  accent: string;
}) {
  return (
    <article className="rounded-3xl border border-white/15 bg-slate-950/55 p-4">
      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accent}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-white">{name}</h3>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-200">
              {risk}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-200/75">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-lg border border-violet-300/25 bg-violet-500/10 px-2 py-1 text-xs text-violet-100">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 h-8 rounded-xl bg-[linear-gradient(135deg,transparent_0%,rgba(34,211,238,0.18)_45%,transparent_46%,rgba(34,211,238,0.24)_70%,transparent_71%)]" />
      <div className="mt-4 flex flex-wrap gap-2">
        {["Website", "BaseScan", "X"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
          >
            {label}
          </button>
        ))}
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
