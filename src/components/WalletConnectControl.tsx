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
import {
  connectorButtonLabel,
  pickPreferredConnector,
} from "@/lib/walletConnectors";

export function WalletConnectControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isOnBase = chainId === base.id;
  const connector = useMemo(() => pickPreferredConnector(connectors), [connectors]);
  const connectLabel = connectorButtonLabel(connector, isConnecting);

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={isConnecting || !connector}
        title={connector ? undefined : "Install the Rabby browser extension"}
        onClick={() =>
          connector &&
          connect({
            connector,
            chainId: base.id,
          })
        }
        className="os-cta os-display w-full px-4 py-3 text-sm sm:w-auto"
      >
        {connectLabel}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <span
          className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 font-mono text-sm font-bold text-violet-100"
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
