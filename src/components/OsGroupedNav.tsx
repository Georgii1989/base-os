"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import { OS_TAB_GROUPS, tabMeta, type OsTabGroupId } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";

const ACCENT_ACTIVE: Record<string, string> = {
  hub: "border-cyan-400/60 bg-cyan-500/15 text-cyan-100",
  trade: "border-violet-400/60 bg-violet-500/15 text-violet-100",
  build: "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100",
  you: "border-emerald-400/60 bg-emerald-500/15 text-emerald-100",
  explore: "border-amber-400/60 bg-amber-500/15 text-amber-100",
  games: "border-rose-400/60 bg-rose-500/15 text-rose-100",
};

const GROUP_LABEL: Record<OsTabGroupId, string> = {
  hub: "border-cyan-400/60 bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.2)]",
  trade:
    "border-violet-400/60 bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-50 shadow-[0_0_14px_rgba(167,139,250,0.18)]",
  build:
    "border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500/30 to-fuchsia-400/10 text-fuchsia-50 shadow-[0_0_14px_rgba(232,121,249,0.18)]",
  you: "border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 to-emerald-400/10 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.18)]",
  explore:
    "border-amber-400/55 bg-gradient-to-br from-amber-500/28 to-amber-400/10 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.16)]",
  games:
    "border-rose-400/55 bg-gradient-to-br from-rose-500/28 to-rose-400/10 text-rose-50 shadow-[0_0_14px_rgba(251,113,133,0.16)]",
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
      className="space-y-2.5"
      onKeyDown={onKeyDown}
    >
      {OS_TAB_GROUPS.map((group) => (
        <div
          key={group.id}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-2 py-2 sm:gap-3 sm:px-3"
        >
          <span
            className={`inline-flex min-w-[4.75rem] shrink-0 items-center justify-center rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] ${GROUP_LABEL[group.id]}`}
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
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? `${ACCENT_ACTIVE[group.id]} shadow-[0_0_16px_rgba(34,211,238,0.12)]`
                      : "border-white/10 bg-black/30 text-slate-400 hover:border-white/25 hover:text-slate-200"
                  }`}
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">
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
