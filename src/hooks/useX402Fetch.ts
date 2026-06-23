"use client";

import { useCallback } from "react";
import type { TypedDataDomain, WalletClient } from "viem";
import { getWalletClient } from "wagmi/actions";
import { useAccount, useConfig } from "wagmi";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { BuilderCodeClientExtension } from "@x402/extensions/builder-code";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import { resolveX402FetchUrl } from "@/lib/x402/clientErrors";
import { X402_BASE_MAINNET } from "@/lib/x402/config";

const DEFAULT_BUILDER_CODE = "bc_59omft8w";

function walletClientToX402Signer(walletClient: WalletClient) {
  const address = walletClient.account?.address;
  if (!address) return null;

  const publicClient = getBasePublicClient();

  return {
    address,
    signTypedData: async (message: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) =>
      walletClient.signTypedData({
        account: address,
        domain: message.domain as TypedDataDomain,
        types: message.types as Record<string, { name: string; type: string }[]>,
        primaryType: message.primaryType,
        message: message.message,
      }),
    readContract: publicClient.readContract.bind(publicClient),
    getTransactionCount: publicClient.getTransactionCount.bind(publicClient),
    estimateFeesPerGas: publicClient.estimateFeesPerGas.bind(publicClient),
  };
}

function buildX402Fetch(walletClient: WalletClient) {
  const signer = walletClientToX402Signer(walletClient);
  if (!signer) return null;

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer,
    networks: [X402_BASE_MAINNET],
  });

  const builderCode =
    process.env.NEXT_PUBLIC_BASE_BUILDER_CODE?.trim() || DEFAULT_BUILDER_CODE;
  client.registerExtension(new BuilderCodeClientExtension(builderCode));

  return wrapFetchWithPayment(fetch, client);
}

/**
 * Returns a fetch helper that signs x402 USDC payments on Base mainnet.
 * Resolves a fresh wallet client on each call (needed after switchChain).
 */
export function useX402Fetch() {
  const config = useConfig();
  const { address, isConnected } = useAccount();

  const ready = Boolean(isConnected && address);

  const payFetch = useCallback(
    async (path: string) => {
      const walletClient = await getWalletClient(config, { chainId: BASE_CHAIN_ID });
      if (!walletClient?.account?.address) {
        throw new Error("Wallet signer not ready. Try reconnecting.");
      }

      const x402Fetch = buildX402Fetch(walletClient);
      if (!x402Fetch) {
        throw new Error("Wallet signer not ready. Try reconnecting.");
      }

      return x402Fetch(resolveX402FetchUrl(path));
    },
    [config]
  );

  return ready ? payFetch : null;
}
