"use client";

import { useState } from "react";
import { SwapPanel } from "@/components/SwapPanel";
import { BridgeRelayPanel } from "@/components/BridgeRelayPanel";
import { BridgeOfficialPanel } from "@/components/BridgeOfficialPanel";

type PanelMode = "swap" | "relay" | "official";

const MODES: { id: PanelMode; label: string }[] = [
  { id: "swap", label: "Swap" },
  { id: "relay", label: "Bridge · Relay" },
  { id: "official", label: "Bridge · Official" },
];

export function SwapBridgePanel() {
  const [mode, setMode] = useState<PanelMode>("swap");

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-violet-300/80">
          Swap and Bridge
        </p>
        <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">Trade & move assets</h2>
      </div>

      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-[11px] font-black transition sm:text-xs ${
              mode === m.id
                ? "bg-gradient-to-r from-violet-600/80 to-cyan-600/60 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "swap" ? <SwapPanel embedded /> : null}
      {mode === "relay" ? <BridgeRelayPanel /> : null}
      {mode === "official" ? <BridgeOfficialPanel /> : null}
    </div>
  );
}
