"use client";

import { useMemo, useState } from "react";
import {
  BRIDGE_CHAINS,
  defaultBridgePair,
  getBridgeChain,
  officialBridgeUrl,
  type BridgeChainId,
} from "@/lib/bridgeChains";

export function BridgeOfficialPanel() {
  const [fromChainId, setFromChainId] = useState<BridgeChainId>(1);
  const toChainId = useMemo(() => {
    const next = defaultBridgePair(fromChainId);
    return next === fromChainId ? 8453 : next;
  }, [fromChainId]);

  const fromChain = getBridgeChain(fromChainId)!;
  const toChain = getBridgeChain(toChainId)!;
  const bridgeUrl = officialBridgeUrl(fromChainId, toChainId);
  const officialOnly = fromChain.officialBridge && toChain.officialBridge;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-sm text-slate-300">
          Official Base bridge — canonical OP Stack route. Best for Ethereum ↔ Base; other L2s
          via Superbridge.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              From
            </span>
            <select
              value={fromChainId}
              onChange={(e) => setFromChainId(Number(e.target.value) as BridgeChainId)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none"
            >
              {BRIDGE_CHAINS.filter((c) => c.officialBridge || c.id === 56).map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-950">
                  {c.name}
                  {!c.officialBridge ? " (use Relay)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              To
            </span>
            <div className="mt-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white">
              {toChain.name}
            </div>
          </label>
        </div>

        {fromChainId === 56 ? (
          <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            BNB Chain has no official Base bridge UI — switch to <strong>Relay</strong> tab.
          </p>
        ) : null}
      </div>

      {officialOnly && fromChainId !== 56 ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
            <iframe
              title="Official Base Bridge"
              src={bridgeUrl}
              className="h-[min(520px,60vh)] w-full border-0 bg-white"
              allow="clipboard-write"
            />
          </div>
          <p className="text-center text-xs text-slate-500">
            If the embed doesn&apos;t load,{" "}
            <a
              href={bridgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              open bridge in a new tab
            </a>
          </p>
        </>
      ) : (
        <a
          href={bridgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-4 text-center text-sm font-black text-cyan-100"
        >
          Open official bridge
        </a>
      )}
    </div>
  );
}
