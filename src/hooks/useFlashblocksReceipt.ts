"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import { BASE_CHAIN_ID } from "@/lib/baseChain";

type Hash = `0x${string}` | undefined;

type WagmiChainId = 1 | 8453 | 84532 | 42161 | 56 | 59144 | 324;

/**
 * Faster receipt polling via Flashblocks preconf RPC configured in wagmi.
 * Treat as UX preconfirmation — critical flows should still handle reorgs.
 */
export function useFlashblocksReceipt(
  hash: Hash,
  enabled = true,
  chainId: WagmiChainId = BASE_CHAIN_ID
) {
  const isBase = chainId === BASE_CHAIN_ID;
  return useWaitForTransactionReceipt({
    hash,
    chainId,
    confirmations: 1,
    pollingInterval: isBase ? 250 : 1_000,
    query: { enabled: Boolean(hash) && enabled },
  });
}
