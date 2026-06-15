import type { Abi, Address, Chain, Hex } from "viem";
import { encodeFunctionData } from "viem";

export type GaslessCall = {
  to: Address;
  data: Hex;
  value?: bigint;
};

export type WalletSendCallsResult = {
  id?: string;
};

type ProviderLike = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

/** Public path proxied to CDP Paymaster (server holds API key). */
export const PAYMASTER_PROXY_PATH = "/api/paymaster";

export function paymasterProxyUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PAYMASTER_PROXY_PATH}`;
}

export function encodeContractCall({
  abi,
  functionName,
  args,
}: {
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}): Hex {
  return encodeFunctionData({
    abi,
    functionName,
    args: args as never,
  });
}

/**
 * EIP-5792 wallet_sendCalls with optional paymaster sponsorship.
 * Returns null when the wallet does not support the RPC method.
 */
export async function tryWalletSendCalls({
  provider,
  chain,
  from,
  calls,
  paymasterUrl,
}: {
  provider: ProviderLike;
  chain: Chain;
  from: Address;
  calls: GaslessCall[];
  paymasterUrl?: string;
}): Promise<WalletSendCallsResult | null> {
  const params = {
    version: "2.0.0",
    chainId: `0x${chain.id.toString(16)}`,
    from,
    calls: calls.map((call) => ({
      to: call.to,
      data: call.data,
      value: `0x${(call.value ?? BigInt(0)).toString(16)}`,
    })),
    ...(paymasterUrl
      ? {
          capabilities: {
            paymasterService: { url: paymasterUrl },
          },
        }
      : {}),
  };

  try {
    const result = await provider.request({
      method: "wallet_sendCalls",
      params: [params],
    });
    if (result && typeof result === "object" && "id" in result) {
      return result as WalletSendCallsResult;
    }
    return {};
  } catch {
    return null;
  }
}

export async function fetchPaymasterStatus(origin: string): Promise<{
  enabled: boolean;
  url: string | null;
}> {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}/api/paymaster`);
    if (!res.ok) return { enabled: false, url: null };
    const body = (await res.json()) as { enabled?: boolean; url?: string };
    const rawUrl = body.url ?? null;
    const absolute =
      rawUrl && !rawUrl.startsWith("http")
        ? `${origin.replace(/\/$/, "")}${rawUrl}`
        : rawUrl;
    return {
      enabled: Boolean(body.enabled),
      url: absolute,
    };
  } catch {
    return { enabled: false, url: null };
  }
}
