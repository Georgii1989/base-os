import { SWAP_TOKEN_PRESETS, findSwapPreset, isNativeEthToken } from "@/lib/swapTokens";

export const SWAP_PREFILL_SELL = "sell";
export const SWAP_PREFILL_BUY = "buy";

export type SwapPrefillState = {
  sellPreset: string;
  sellCustom: string;
  buyPreset: string;
  buyCustom: string;
};

/** Build `/?tab=swap` href with optional sell/buy (preset id or `0x` address). */
export function buildSwapTabHref(options?: {
  sell?: string;
  buy?: string;
}): string {
  const params = new URLSearchParams({ tab: "swap" });
  if (options?.sell?.trim()) params.set(SWAP_PREFILL_SELL, options.sell.trim());
  if (options?.buy?.trim()) params.set(SWAP_PREFILL_BUY, options.buy.trim());
  return `/?${params.toString()}`;
}

export function parseSwapPrefillParams(
  searchParams: Pick<URLSearchParams, "get">
): { sell?: string; buy?: string } | null {
  const sell = searchParams.get(SWAP_PREFILL_SELL)?.trim();
  const buy = searchParams.get(SWAP_PREFILL_BUY)?.trim();
  if (!sell && !buy) return null;
  return { sell: sell || undefined, buy: buy || undefined };
}

function refToPresetPair(ref: string): { preset: string; custom: string } | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "eth" || isNativeEthToken(trimmed)) {
    return { preset: "eth", custom: "" };
  }
  const byId = SWAP_TOKEN_PRESETS.find((t) => t.id === trimmed);
  if (byId) return { preset: byId.id, custom: "" };
  const known = findSwapPreset(trimmed);
  if (known) return { preset: known.id, custom: "" };
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { preset: "custom", custom: trimmed };
  }
  return null;
}

/** Map URL prefill to SwapPanel state. Unknown refs are ignored. */
export function swapPrefillToState(prefill: {
  sell?: string;
  buy?: string;
}): Partial<SwapPrefillState> | null {
  const out: Partial<SwapPrefillState> = {};
  if (prefill.sell) {
    const sell = refToPresetPair(prefill.sell);
    if (!sell) return null;
    out.sellPreset = sell.preset;
    out.sellCustom = sell.custom;
  }
  if (prefill.buy) {
    const buy = refToPresetPair(prefill.buy);
    if (!buy) return null;
    out.buyPreset = buy.preset;
    out.buyCustom = buy.custom;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function portfolioTokenRef(tokenAddress: string): string {
  const known = findSwapPreset(tokenAddress);
  return known ? known.id : tokenAddress;
}

/** Portfolio token → sell this asset, receive ETH. */
export function buildPortfolioSwapSellHref(tokenAddress: string): string {
  return buildSwapTabHref({ sell: portfolioTokenRef(tokenAddress), buy: "eth" });
}

/** Portfolio token → pay ETH, receive this asset. */
export function buildPortfolioSwapBuyHref(tokenAddress: string): string {
  return buildSwapTabHref({ sell: "eth", buy: portfolioTokenRef(tokenAddress) });
}
