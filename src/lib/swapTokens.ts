/** 0x native ETH sentinel (not WETH). */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export type { SwapTokenPreset } from "@/lib/swapBaseTokens";
export { BASE_TOP_SWAP_TOKENS as SWAP_TOKEN_PRESETS } from "@/lib/swapBaseTokens";

import { BASE_TOP_SWAP_TOKENS as SWAP_TOKEN_PRESETS } from "@/lib/swapBaseTokens";
import type { SwapTokenPreset } from "@/lib/swapBaseTokens";

export function isNativeEthToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_ETH.toLowerCase();
}

export function findSwapPreset(address: string): SwapTokenPreset | undefined {
  const lower = address.toLowerCase();
  return SWAP_TOKEN_PRESETS.find((t) => t.address.toLowerCase() === lower);
}

export function resolveSwapToken(
  presetIdOrAddress: string,
  customAddress?: string
): SwapTokenPreset | null {
  const preset = SWAP_TOKEN_PRESETS.find((t) => t.id === presetIdOrAddress);
  if (preset) return preset;

  if (presetIdOrAddress === "custom" && customAddress) {
    const trimmed = customAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
    const known = findSwapPreset(trimmed);
    if (known) return known;
    return {
      id: "custom",
      symbol: "TOKEN",
      name: "TOKEN",
      address: trimmed as `0x${string}`,
      decimals: 18,
    };
  }

  return null;
}

export type SwapQuoteResponse = {
  buyAmount: string;
  sellAmount: string;
  buyToken: string;
  sellToken: string;
  estimatedGas: string | null;
  allowanceTarget: `0x${string}` | null;
  transaction: {
    to: `0x${string}`;
    data: `0x${string}`;
    value: string;
    gas: string | null;
  };
  needsApproval: boolean;
};

export type SwapQuoteError = {
  error: string;
  hint?: string;
};

export function tokenAccent(symbol: string): string {
  const hues: Record<string, string> = {
    ETH: "from-cyan-400/35 to-blue-600/25 text-cyan-50",
    WETH: "from-cyan-400/35 to-blue-600/25 text-cyan-50",
    LINK: "from-cyan-400/35 to-blue-600/25 text-cyan-50",
    USDC: "from-sky-400/35 to-blue-500/25 text-sky-50",
    USDT: "from-emerald-400/35 to-teal-600/25 text-emerald-50",
    USDbC: "from-sky-400/35 to-indigo-500/25 text-sky-50",
    DEGEN: "from-violet-400/35 to-purple-600/25 text-violet-50",
    BRETT: "from-amber-400/35 to-orange-600/25 text-amber-50",
    AERO: "from-indigo-400/35 to-violet-600/25 text-indigo-50",
    MORPHO: "from-indigo-400/35 to-violet-600/25 text-indigo-50",
    VIRTUAL: "from-emerald-400/30 to-cyan-600/20 text-emerald-50",
    VVV: "from-rose-400/30 to-orange-600/20 text-rose-50",
    ZRO: "from-sky-400/35 to-indigo-500/25 text-sky-50",
    SHIB: "from-orange-400/30 to-amber-600/20 text-orange-50",
    BONK: "from-yellow-400/30 to-orange-600/20 text-yellow-50",
    KAITO: "from-blue-400/30 to-indigo-600/20 text-blue-50",
    ZORA: "from-rose-400/30 to-fuchsia-600/20 text-rose-50",
  };
  return hues[symbol] ?? "from-fuchsia-400/30 to-purple-600/20 text-fuchsia-50";
}

export function formatSwapBalance(raw: string, symbol: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n === 0) return `0 ${symbol}`;
  if (n < 0.0001) return `<0.0001 ${symbol}`;
  if (n < 1) return `${n.toFixed(4)} ${symbol}`;
  if (n < 1000) return `${n.toFixed(3)} ${symbol}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
}
