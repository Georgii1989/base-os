"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import { OS_TAB_GROUPS, tabMeta } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";

const ACCENT_ACTIVE: Record<string, string> = {
  hub: "border-cyan-400/60 bg-cyan-500/15 text-cyan-100",
  trade: "border-violet-400/60 bg-violet-500/15 text-violet-100",
  build: "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100",
  you: "border-emerald-400/60 bg-emerald-500/15 text-emerald-100",
  explore: "border-amber-400/60 bg-amber-500/15 text-amber-100",
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
      className="mt-4 space-y-3 border-b border-[#6b2248]/70 pb-3"
      onKeyDown={onKeyDown}
    >
      {OS_TAB_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 px-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-600">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
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
