"use client";

import { useMemo } from "react";
import type { TypedDataDomain, WalletClient } from "viem";
import { useWalletClient } from "wagmi";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { BuilderCodeClientExtension } from "@x402/extensions/builder-code";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
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

/**
 * Wallet-backed fetch that signs x402 USDC payments on Base mainnet.
 * Returns null until a wallet client is available on chain 8453.
 */
export function useX402Fetch() {
  const { data: walletClient } = useWalletClient({ chainId: BASE_CHAIN_ID });

  return useMemo(() => {
    if (!walletClient) return null;
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
  }, [walletClient]);
}
