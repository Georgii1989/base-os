"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import { OS_TAB_GROUPS, tabMeta, type OsTabGroupId } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";

const ACCENT_ACTIVE: Record<string, string> = {
  hub: "border-amber-400/55 bg-amber-500/12 text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  trade: "border-violet-400/55 bg-violet-500/12 text-violet-50 shadow-[0_0_20px_rgba(139,92,246,0.12)]",
  build: "border-fuchsia-400/50 bg-fuchsia-500/12 text-fuchsia-50 shadow-[0_0_18px_rgba(232,121,249,0.12)]",
  you: "border-emerald-400/50 bg-emerald-500/12 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.1)]",
  explore: "border-amber-300/45 bg-amber-400/10 text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.1)]",
  games: "border-rose-400/50 bg-rose-500/12 text-rose-50 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
};

const GROUP_LABEL: Record<OsTabGroupId, string> = {
  hub: "border-amber-400/50 bg-gradient-to-br from-amber-500/25 to-amber-600/5 text-amber-50 shadow-[0_0_16px_rgba(245,158,11,0.12)]",
  trade:
    "border-violet-400/50 bg-gradient-to-br from-violet-500/25 to-violet-600/5 text-violet-50 shadow-[0_0_14px_rgba(139,92,246,0.12)]",
  build:
    "border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-500/22 to-fuchsia-600/5 text-fuchsia-50 shadow-[0_0_14px_rgba(232,121,249,0.1)]",
  you: "border-emerald-400/45 bg-gradient-to-br from-emerald-500/22 to-emerald-600/5 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.1)]",
  explore:
    "border-amber-300/40 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.08)]",
  games:
    "border-rose-400/45 bg-gradient-to-br from-rose-500/22 to-rose-600/5 text-rose-50 shadow-[0_0_14px_rgba(251,113,133,0.1)]",
};

type Props = {
  activeTab: OsTabId;
  onSelect: (tab: OsTabId) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  tabButtonRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
};

export function OsGroupedNav({ activeTab, onSelect, onKeyDown, tabButtonRefs }: Props) {
  let flatIndex = 0;

  return (
    <nav
      role="tablist"
      aria-label="Base OS modules"
      className="space-y-2"
      onKeyDown={onKeyDown}
    >
      {OS_TAB_GROUPS.map((group) => (
        <div key={group.id} className="os-nav-group">
          <span
            className={`os-display inline-flex min-w-[4.75rem] shrink-0 items-center justify-center rounded-lg border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] ${GROUP_LABEL[group.id]}`}
          >
            {group.label}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {group.tabIds.map((tabId) => {
              const tab = tabMeta(tabId);
              const idx = flatIndex++;
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  ref={(el) => {
                    tabButtonRefs.current[idx] = el;
                  }}
                  id={`base-os-tab-${tabId}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`base-os-panel-${tabId}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onSelect(tabId)}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-200 ${
                    isActive
                      ? ACCENT_ACTIVE[group.id]
                      : "border-white/[0.08] bg-black/25 text-slate-400 hover:border-violet-400/25 hover:bg-violet-500/5 hover:text-slate-100"
                  }`}
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] opacity-65">
                    {tab.eyebrow}
                  </span>
                  <span className="block text-sm font-bold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function primaryTabCount(): number {
  return OS_TAB_GROUPS.reduce((n, g) => n + g.tabIds.length, 0);
}
