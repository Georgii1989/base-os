"use client";

import { useMemo } from "react";
import { base } from "wagmi/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";

function pickConnector(connectors: ReturnType<typeof useConnect>["connectors"]) {
  return (
    connectors.find(
      (c) =>
        c.id === "baseAccount" ||
        c.name.toLowerCase().includes("base") ||
        c.name.toLowerCase().includes("coinbase")
    ) ?? connectors[0]
  );
}

export function WalletConnectControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isOnBase = chainId === base.id;
  const connector = useMemo(() => pickConnector(connectors), [connectors]);

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={isConnecting || !connector}
        onClick={() => connector && connect({ connector })}
        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-4 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(217,70,239,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <span
          className="rounded-2xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-3 py-2 font-mono text-sm font-bold text-fuchsia-100"
          title={address}
        >
          {address ? shortenAddressDisplay(address) : "Connected"}
        </span>
        {!isOnBase ? (
          <button
            type="button"
            disabled={isSwitchingChain}
            onClick={() => switchChainAsync({ chainId: base.id })}
            className="rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50"
          >
            {isSwitchingChain ? "Switching…" : "Switch to Base"}
          </button>
        ) : (
          <span className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            Base
          </span>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:border-white/40"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
