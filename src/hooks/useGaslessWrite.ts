"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnectorClient } from "wagmi";
import { base } from "wagmi/chains";
import {
  encodeContractCall,
  fetchPaymasterStatus,
  paymasterProxyUrl,
  tryWalletSendCalls,
  type GaslessCall,
} from "@/lib/gaslessWrite";
import { isBaseAppEmbed } from "@/lib/isBaseAppEmbed";
import type { Abi, Address } from "viem";

type ContractWriteRequest = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

/**
 * Attempt gasless EIP-5792 sendCalls in Base App when paymaster proxy is configured.
 * Falls back to null so callers can use writeContract.
 */
export function useGaslessWrite() {
  const { address, isConnected } = useAccount();
  const { data: client } = useConnectorClient();
  const [paymasterUrl, setPaymasterUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    void (async () => {
      const status = await fetchPaymasterStatus(window.location.origin);
      if (cancelled) return;
      setPaymasterUrl(status.enabled ? status.url ?? paymasterProxyUrl(window.location.origin) : null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSponsor = ready && Boolean(paymasterUrl) && isConnected && isBaseAppEmbed();

  const sendGasless = useCallback(
    async (request: ContractWriteRequest): Promise<boolean> => {
      if (!canSponsor || !address || !client || !paymasterUrl) return false;

      const data = encodeContractCall({
        abi: request.abi,
        functionName: request.functionName,
        args: request.args,
      });

      const calls: GaslessCall[] = [
        {
          to: request.address,
          data,
          value: request.value ?? BigInt(0),
        },
      ];

      const provider = client.transport as unknown as {
        request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
      };
      const ethereum =
        typeof window !== "undefined"
          ? (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown }) => Promise<unknown> } })
              .ethereum
          : undefined;

      const requestFn = ethereum?.request ?? provider.request;
      if (!requestFn) return false;

      const sent = await tryWalletSendCalls({
        provider: { request: requestFn },
        chain: base,
        from: address,
        calls,
        paymasterUrl,
      });
      return sent != null;
    },
    [address, canSponsor, client, paymasterUrl]
  );

  return { canSponsor, paymasterUrl, sendGasless, ready };
}
