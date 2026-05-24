"use client";

import { useMemo, useState } from "react";
import { BridgeChainIcon } from "@/components/BridgeChainIcon";
import { BridgeChainSelect } from "@/components/BridgeChainSelect";
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
  const chainOptions = BRIDGE_CHAINS.filter((c) => c.officialBridge || c.id === 56);

  const bridgeHint =
    fromChainId === 1 || toChainId === 1
      ? "Official Base bridge at bridge.base.org"
      : "Official route via Superbridge";

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-sm text-slate-300">
          Official Base bridge — canonical OP Stack route. Best for Ethereum ↔ Base; other L2s
          via Superbridge.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BridgeChainSelect
            label="From"
            value={fromChainId}
            onChange={setFromChainId}
            chains={chainOptions}
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              To
            </span>
            <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white">
              <BridgeChainIcon chainId={toChainId} size={28} />
              {toChain.name}
            </div>
          </div>
        </div>

        {fromChainId === 56 ? (
          <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            BNB Chain has no official Base bridge UI — switch to <strong>Relay</strong> tab.
          </p>
        ) : null}
      </div>

      {officialOnly && fromChainId !== 56 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-black/95 p-6">
          <div className="flex items-center justify-center gap-5 py-2">
            <div className="flex flex-col items-center gap-2">
              <BridgeChainIcon chainId={fromChainId} size={52} />
              <span className="text-xs font-bold text-slate-400">{fromChain.shortName}</span>
            </div>
            <span className="text-2xl text-slate-500">→</span>
            <div className="flex flex-col items-center gap-2">
              <BridgeChainIcon chainId={toChainId} size={52} />
              <span className="text-xs font-bold text-slate-400">{toChain.shortName}</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">{bridgeHint}</p>
          <a
            href={bridgeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 text-center text-base font-black text-white transition hover:opacity-95"
          >
            Open official bridge ↗
          </a>
          <p className="mt-3 text-center text-[10px] text-slate-600">
            Opens in a new tab — bridge sites block in-app embedding
          </p>
        </div>
      ) : (
        <a
          href={bridgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-4 text-center text-sm font-black text-cyan-100"
        >
          <BridgeChainIcon chainId={fromChainId} size={24} />
          Open official bridge ↗
        </a>
      )}
    </div>
  );
}
