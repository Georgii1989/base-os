"use client";

import type { OsTabId } from "@/lib/osTabs";
import { ReflectAuroraDivider } from "@/components/reflect/ReflectAuroraDivider";
import { ReflectFeatureGrid } from "@/components/reflect/ReflectFeatureGrid";
import { ReflectScrollReveal } from "@/components/reflect/ReflectScrollReveal";
import { ReflectSectionHeader } from "@/components/reflect/ReflectSectionHeader";

type Props = {
  setActiveTab: (tab: OsTabId) => void;
  onOpenCommandPalette: () => void;
};

export function ReflectLandingPage({ setActiveTab, onOpenCommandPalette }: Props) {
  return (
    <div className="relative z-10 pb-20">
      <ReflectAuroraDivider />

      <ReflectScrollReveal className="mx-auto max-w-[min(100%,1100px)] px-4 py-16 md:py-24">
        <ReflectSectionHeader
          eyebrow="Modules"
          title="Everything on Base, one surface"
          subtitle="Score wallets, swap tokens, browse apps, play onchain — switch tabs without leaving the OS."
        />
        <div className="mt-10">
          <ReflectFeatureGrid onSelect={setActiveTab} />
        </div>
      </ReflectScrollReveal>

      <ReflectAuroraDivider />

      <ReflectScrollReveal className="mx-auto max-w-[min(100%,900px)] px-4 py-16 md:py-20">
        <ReflectSectionHeader
          eyebrow="Agent-ready"
          title="Built for humans and agents"
          subtitle="Deep links, ⌘K palette, and structured panels — so you or an agent can operate Base without hunting URLs."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Deep links",
              text: "Share ?tab=score&address=… — opens the right panel with context.",
            },
            {
              title: "Command palette",
              text: "Jump to any module instantly. Lens preview stays palette-only.",
            },
            {
              title: "Live data",
              text: "Analytics, radar prices, and portfolio sync from Base APIs.",
            },
          ].map((item) => (
            <article key={item.title} className="reflect-feature-card">
              <h3 className="reflect-feature-card__title">{item.title}</h3>
              <p className="reflect-feature-card__desc mt-2">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={onOpenCommandPalette} className="os-cta px-5 py-2.5 text-sm">
            Open command palette
          </button>
        </div>
      </ReflectScrollReveal>

      <ReflectAuroraDivider />

      <ReflectScrollReveal className="mx-auto max-w-[min(100%,900px)] px-4 py-16 md:py-20">
        <ReflectSectionHeader
          eyebrow="Radar"
          title="Curated Base ecosystem"
          subtitle="Projects we track — with live prices, risk tags, and favorites you can star."
        />
        <div className="mt-10 reflect-feature-card flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="reflect-feature-card__desc">
              Filter by category, stage, and risk. Pin favorites for quick access from the sidebar.
            </p>
          </div>
          <button type="button" onClick={() => setActiveTab("radar")} className="os-cta shrink-0 px-5 py-2.5 text-sm">
            Browse radar
          </button>
        </div>
      </ReflectScrollReveal>

      <ReflectAuroraDivider />

      <ReflectScrollReveal className="mx-auto max-w-[min(100%,900px)] px-4 py-16 md:py-20">
        <ReflectSectionHeader
          eyebrow="Guard"
          title="Protect before you sign"
          subtitle="Review token approvals and revoke risky allowances — paste any address or use your connected wallet."
        />
        <div className="mt-10 reflect-feature-card flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <p className="reflect-feature-card__desc">
            Wallet Guard scans ERC-20 approvals on Base and surfaces unlimited spenders first.
          </p>
          <button type="button" onClick={() => setActiveTab("guard")} className="os-cta shrink-0 px-5 py-2.5 text-sm">
            Open guard
          </button>
        </div>
      </ReflectScrollReveal>

      <footer className="mx-auto max-w-[min(100%,900px)] px-4 pt-12 text-center">
        <p className="text-[13px] text-[var(--color-fog)]">
          Base OS · Onchain command center for Base L2
        </p>
        <p className="mt-2 text-[12px] text-[var(--color-steel)]">
          Not financial advice. Verify contracts before signing.
        </p>
      </footer>
    </div>
  );
}
