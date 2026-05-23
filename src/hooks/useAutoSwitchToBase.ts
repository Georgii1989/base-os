"use client";

import { useEffect, useRef } from "react";
import { base } from "wagmi/chains";
import { useAccount, useSwitchChain } from "wagmi";

type Options = {
  /** When false, skip auto-switch (e.g. Swap and Bridge tab needs Ethereum for bridging). */
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: () => void;
};

/**
 * After connect, prompt the wallet to switch to Base (e.g. user was on Ethereum mainnet).
 */
export function useAutoSwitchToBase(options?: Options) {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const triedRef = useRef(false);
  const enabled = options?.enabled ?? true;
  const onSuccess = options?.onSuccess;
  const onError = options?.onError;

  useEffect(() => {
    if (!enabled) return;
    if (!isConnected) {
      triedRef.current = false;
      return;
    }
    if (chainId === base.id || triedRef.current || isSwitchingChain) return;

    triedRef.current = true;
    switchChainAsync({ chainId: base.id })
      .then(() => onSuccess?.())
      .catch(() => {
        triedRef.current = false;
        onError?.();
      });
  }, [enabled, isConnected, chainId, isSwitchingChain, switchChainAsync, onSuccess, onError]);
}
