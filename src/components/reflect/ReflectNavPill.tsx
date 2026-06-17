"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import { BaseOsAppIcon } from "@/components/BaseOsAppIcon";
import { WalletConnectControl } from "@/components/WalletConnectControl";
import type { OsTabGroup } from "@/lib/osTabGroups";
import { OS_TAB_GROUPS, tabMeta } from "@/lib/osTabGroups";
import { OS_EMBED_TAB_GROUPS } from "@/lib/baseAppEmbedNav";
import { REFLECT_PRIMARY_NAV } from "@/lib/reflectModules";
import type { OsTabId } from "@/lib/osTabs";

type Props = {
  activeTab: OsTabId;
  onSelect: (tab: OsTabId) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  tabButtonRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  onOpenCommandPalette: () => void;
  isEmbed?: boolean;
  tabGroups?: readonly OsTabGroup[];
};

export function ReflectNavPill({
  activeTab,
  onSelect,
  onKeyDown,
  tabButtonRefs,
  onOpenCommandPalette,
  isEmbed = false,
  tabGroups = OS_TAB_GROUPS,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const groups = isEmbed ? OS_EMBED_TAB_GROUPS : tabGroups;

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  let flatIndex = 0;

  return (
    <div className="sticky top-4 z-50 flex justify-center px-3 md:top-6">
      <nav
        role="tablist"
        aria-label="Base OS modules"
        className="reflect-nav-pill w-full max-w-[min(100%,920px)] flex-wrap justify-between gap-y-2"
        onKeyDown={onKeyDown}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BaseOsAppIcon size={28} />
          <span className="os-display hidden text-[15px] text-[var(--color-lilac-white)] sm:inline">
            Base OS
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-0.5 px-1">
          {REFLECT_PRIMARY_NAV.map((tabId) => {
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
                className={`reflect-nav-link ${isActive ? "reflect-nav-link--active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={`reflect-nav-link ${menuOpen ? "reflect-nav-link--active" : ""}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              Modules ▾
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute left-1/2 top-[calc(100%+8px)] z-50 max-h-[min(60vh,420px)] w-[min(92vw,320px)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-[rgba(145,142,160,0.15)] bg-[var(--color-midnight-surface)] p-3 shadow-[var(--shadow-lg-2)]"
              >
                {groups.map((group) => (
                  <div key={group.id} className="mb-3 last:mb-0">
                    <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-fog)]">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
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
                            onClick={() => {
                              onSelect(tabId);
                              setMenuOpen(false);
                            }}
                            className={`w-full rounded-[5px] px-2 py-2 text-left text-[14px] transition-colors ${
                              isActive
                                ? "bg-[var(--color-deep-indigo)] text-[var(--color-lavender-accent)]"
                                : "text-[var(--color-lilac-white)] hover:bg-[rgba(16,9,58,0.5)]"
                            }`}
                          >
                            <span className="block text-[11px] text-[var(--color-fog)]">{tab.eyebrow}</span>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!isEmbed ? (
            <button
              type="button"
              title="⌘ K or Ctrl K"
              onClick={onOpenCommandPalette}
              className="reflect-ghost-btn hidden sm:inline"
            >
              ⌘K
            </button>
          ) : null}
          <WalletConnectControl />
        </div>
      </nav>
    </div>
  );
}
