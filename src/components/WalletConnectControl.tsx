"use client";

import { useMemo } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import {
  connectorButtonLabel,
  pickPreferredConnector,
} from "@/lib/walletConnectors";

export function WalletConnectControl() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isOnBase = chainId === BASE_CHAIN_ID;
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
            chainId: BASE_CHAIN_ID,
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
        <span className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2">
          {address ? (
            <OsAddressDisplay
              address={address}
              monoClassName="font-mono text-sm font-bold text-violet-100"
            />
          ) : (
            <span className="font-mono text-sm font-bold text-violet-100">Connected</span>
          )}
        </span>
        {!isOnBase ? (
          <button
            type="button"
            disabled={isSwitchingChain}
            onClick={() => switchChainAsync({ chainId: BASE_CHAIN_ID })}
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
