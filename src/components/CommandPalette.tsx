"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getAddress, isAddress } from "viem";
import { OS_TAB_META, type OsTabId } from "@/lib/osTabs";
import { radarProjects } from "@/lib/radarProjects";

type CommandPaletteContextValue = {
  open: () => void;
  close: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  return useContext(CommandPaletteContext) ?? { open: () => {}, close: () => {} };
}

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  keywords?: string;
  run: () => void;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function matchesQuery(q: string, cmd: CommandItem) {
  if (!q) return true;
  const hay = norm(`${cmd.title} ${cmd.subtitle ?? ""} ${cmd.keywords ?? ""}`);
  return hay.includes(q);
}

function tabCommandIcon(tabId: OsTabId): string {
  switch (tabId) {
    case "home":
      return "◆";
    case "radar":
      return "◎";
    case "watch":
      return "⌁";
    case "lens":
      return "⎔";
    case "guard":
      return "⎊";
    case "wallet":
      return "◇";
    case "tip":
    default:
      return "✦";
  }
}

function tabNavKeywords(tab: { id: OsTabId; label: string; eyebrow: string }): string {
  const base = `${tab.label} ${tab.eyebrow} tab`;
  switch (tab.id) {
    case "watch":
      return `${base} track watchlist wallet list activity balance`;
    case "lens":
      return `${base} preview test simulate transaction calldata gas revert`;
    case "guard":
      return `${base} allowance permission token revoke access`;
    case "wallet":
      return `${base} connect identity`;
    default:
      return base;
  }
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const api = useMemo(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    []
  );

  const baseCommands = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = OS_TAB_META.map((tab) => ({
      id: `nav-${tab.id}`,
      title: `Go to ${tab.label}`,
      subtitle: tab.eyebrow,
      icon: tabCommandIcon(tab.id),
      keywords: tabNavKeywords(tab),
      run: () => {
        router.push(`/?tab=${tab.id}`);
        setOpen(false);
      },
    }));

    const radar: CommandItem[] = radarProjects.slice(0, 14).map((project) => ({
      id: `radar-${project.id}`,
      title: project.name,
      subtitle: `${project.symbol} · ${project.risk} risk · Radar`,
      icon: "◉",
      keywords: `${project.name} ${project.symbol} ${project.categories.join(" ")} discover`,
      run: () => {
        router.push(`/?tab=radar`);
        setOpen(false);
      },
    }));

    const portal: CommandItem[] = [
      {
        id: "portal-safety",
        title: "Address lookup",
        subtitle: "Wallet not needed",
        icon: "⬡",
        keywords: "analyze check contract wallet lookup profile public",
        run: () => {
          router.push("/safety");
          setOpen(false);
        },
      },
      {
        id: "ext-basescan",
        title: "BaseScan",
        subtitle: "Explorer for Base",
        icon: "⎋",
        keywords: "chain scan trace",
        run: () => {
          window.open("https://basescan.org", "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "ext-revoke",
        title: "revoke.cash",
        subtitle: "Review token permissions",
        icon: "⎚",
        keywords: "guard allowance revoke usdc spender",
        run: () => {
          window.open("https://revoke.cash/chain/8453", "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "ext-bridge",
        title: "Base Bridge",
        subtitle: "Official bridge",
        icon: "⇄",
        keywords: "deposit withdraw official",
        run: () => {
          window.open("https://bridge.base.org", "_blank", "noopener,noreferrer");
        },
      },
    ];

    return [...portal, ...nav, ...radar];
  }, [router]);

  const filteredCommands = useMemo(() => {
    const q = norm(query);
    const trimmed = query.trim();
    let list = baseCommands.filter((cmd) => matchesQuery(q, cmd));

    if (isAddress(trimmed)) {
      const checksum = getAddress(trimmed as `0x${string}`);
      const hit: CommandItem = {
        id: `inspect-${checksum}`,
        title: `Open address page`,
        subtitle: checksum,
        icon: "◇",
        keywords: "",
        run: () => {
          router.push(`/safety/${checksum}`);
          setOpen(false);
        },
      };
      list = [hit, ...list.filter((c) => c.id !== hit.id)];
    }

    const partial = trimmed.startsWith("0x") && trimmed.length >= 4 && trimmed.length < 42;
    if (partial && !list.some((c) => c.id.startsWith("inspect-"))) {
      list = [
        {
          id: "hint-address",
          title: "Keep typing…",
          subtitle: "Full address is 42 characters (0x + 40).",
          icon: "→",
          run: () => {},
        },
        ...list,
      ];
    }

    return list;
  }, [baseCommands, query, router]);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedIndex(0);
    });
  }, [query, open]);

  useEffect(() => {
    function onToggle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onToggle);
    return () => window.removeEventListener("keydown", onToggle);
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onEscape);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector?.(`[data-cmd-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex, open]);

  const runSelected = useCallback(() => {
    const cmd = filteredCommands[selectedIndex];
    if (!cmd) return;
    if (cmd.id === "hint-address") {
      inputRef.current?.focus();
      return;
    }
    cmd.run();
  }, [filteredCommands, selectedIndex]);

  const onPaletteListClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const row = target?.closest("[data-palette-command-id]");
      if (!(row instanceof HTMLElement)) return;
      const id = row.dataset.paletteCommandId;
      if (!id) return;
      const cmd = filteredCommands.find((c) => c.id === id);
      if (!cmd) return;
      if (cmd.id === "hint-address") {
        inputRef.current?.focus();
        return;
      }
      cmd.run();
    },
    [filteredCommands]
  );

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, Math.max(filteredCommands.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        runSelected();
      }
    },
    [filteredCommands.length, runSelected]
  );

  return (
    <CommandPaletteContext.Provider value={api}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[#070312]/85 px-3 pt-[14vh] backdrop-blur-md sm:px-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/18 bg-gradient-to-br from-black/92 via-zinc-950/95 to-black/92 shadow-[0_0_120px_rgba(168,85,247,0.35),0_0_60px_rgba(34,211,238,0.12)]"
          >
            <div className="pointer-events-none absolute inset-px rounded-[1.68rem] border border-white/8" />
            <div className="relative px-4 pb-4 pt-4 md:px-5 md:pt-5">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-200/85">
                  Base OS
                </p>
                <h2 className="text-lg font-black tracking-tight text-white md:text-xl">
                  Quick menu
                </h2>
                <p className="text-xs text-slate-400">
                  Jump to tabs, apps, or address lookup. Paste any 0x address to open its page.
                </p>
              </div>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/75">
                  ⌕
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  autoComplete="off"
                  aria-label="Filter commands"
                  placeholder="Search or paste 0x…"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  className="w-full rounded-2xl border border-white/12 bg-black/55 py-3 pl-9 pr-3 text-sm text-white outline-none ring-2 ring-transparent transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                />
              </div>
              <div
                ref={listRef}
                className="mt-3 max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain pb-2"
                role="listbox"
                onClick={onPaletteListClick}
              >
                {filteredCommands.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
                    Nothing matches{" "}
                    <span className="font-semibold text-cyan-200/90">{query}</span>.
                  </p>
                ) : (
                  filteredCommands.map((cmd, index) => {
                    const active = index === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        data-palette-command-id={cmd.id}
                        data-cmd-index={index}
                        aria-selected={active}
                        data-active={active}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`mb-2 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition md:gap-4 md:px-4 md:py-3.5 ${active ? "border-cyan-300/65 bg-gradient-to-br from-cyan-500/15 via-fuchsia-500/15 to-purple-950/40 shadow-[0_0_32px_rgba(34,211,238,0.15)]" : "border-transparent bg-white/[0.04] hover:border-white/14 hover:bg-white/[0.07]"}`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${active ? "bg-cyan-400/25 text-cyan-50" : "bg-white/[0.08] text-slate-300"}`}
                        >
                          {cmd.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-[15px] leading-snug text-white">
                            {cmd.title}
                          </span>
                          {cmd.subtitle ? (
                            <span className="mt-1 block truncate text-xs text-slate-400 md:text-[13px]">
                              {cmd.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-500">
                <span className="flex flex-wrap gap-3 font-medium">
                  <span>
                    <kbd className="rounded border border-white/14 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
 ↑↓
                    </kbd>{" "}
                    move
                  </span>
                  <span>
                    <kbd className="rounded border border-white/14 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
 ↵
                    </kbd>{" "}
                    run
                  </span>
                  <span>
                    <kbd className="rounded border border-white/14 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
 esc
                    </kbd>{" "}
                    exit
                  </span>
                </span>
                <button
                  type="button"
                  className="font-bold text-cyan-200/85 hover:text-cyan-50"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CommandPaletteContext.Provider>
  );
}
