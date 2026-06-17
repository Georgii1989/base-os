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
        <span className="rounded-[5px] border border-[rgba(147,130,255,0.25)] bg-[rgba(16,9,58,0.6)] px-3 py-2">
          {address ? (
            <OsAddressDisplay
              address={address}
              monoClassName="font-mono text-sm font-medium text-[var(--color-lilac-white)]"
            />
          ) : (
            <span className="font-mono text-sm font-medium text-[var(--color-lilac-white)]">Connected</span>
          )}
        </span>
        {!isOnBase ? (
          <button
            type="button"
            disabled={isSwitchingChain}
            onClick={() => switchChainAsync({ chainId: BASE_CHAIN_ID })}
            className="os-cta-ghost px-3 py-2 text-xs disabled:opacity-50"
          >
            {isSwitchingChain ? "Switching…" : "Switch to Base"}
          </button>
        ) : (
          <span className="rounded-[5px] border border-[rgba(147,130,255,0.2)] bg-[rgba(16,9,58,0.5)] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-lavender-accent)]">
            Base
          </span>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="reflect-ghost-btn border border-[rgba(145,142,160,0.15)] px-3 py-2 text-xs"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
