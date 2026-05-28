"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SwapPanel } from "@/components/SwapPanel";
import { BridgeRelayPanel } from "@/components/BridgeRelayPanel";
import { parseSwapPrefillParams } from "@/lib/swapPrefill";

type PanelMode = "swap" | "bridge";

export function SwapBridgePanel() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<PanelMode>("swap");

  useEffect(() => {
    if (parseSwapPrefillParams(searchParams)) setMode("swap");
  }, [searchParams]);

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-violet-300/80">
          Trade
        </p>
        <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">Swap & Bridge</h2>
        <p className="mt-2 text-sm text-slate-400">Swap on Base · cross-chain bridge via Relay</p>
      </div>

      <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
        {(
          [
            { id: "swap" as const, label: "Swap on Base" },
            { id: "bridge" as const, label: "Bridge" },
          ] as const
        ).map((m) => (
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
      {mode === "bridge" ? <BridgeRelayPanel /> : null}
    </div>
  );
}
