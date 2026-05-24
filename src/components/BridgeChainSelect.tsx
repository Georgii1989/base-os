"use client";

import { useEffect, useRef, useState } from "react";
import type { BridgeChainConfig, BridgeChainId } from "@/lib/bridgeChains";
import { BridgeChainIcon } from "@/components/BridgeChainIcon";

function chainLabel(chain: BridgeChainConfig): string {
  if (!chain.officialBridge) return `${chain.name} · Relay only`;
  return chain.name;
}

export function BridgeChainSelect({
  label,
  value,
  onChange,
  chains,
  disabled,
}: {
  label: string;
  value: BridgeChainId;
  onChange: (id: BridgeChainId) => void;
  chains: BridgeChainConfig[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = chains.find((c) => c.id === value) ?? chains[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left text-sm font-bold text-white outline-none transition hover:border-cyan-400/30 disabled:opacity-50"
      >
        <BridgeChainIcon chainId={value} size={28} />
        <span className="min-w-0 flex-1 truncate">{chainLabel(selected)}</span>
        <span className="text-[10px] text-slate-500">▾</span>
      </button>
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950 py-1 shadow-xl shadow-black/60">
          {chains.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-bold transition hover:bg-white/5 ${
                  c.id === value ? "bg-cyan-500/10 text-cyan-100" : "text-white"
                }`}
              >
                <BridgeChainIcon chainId={c.id} size={28} />
                <span className="truncate">{chainLabel(c)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
