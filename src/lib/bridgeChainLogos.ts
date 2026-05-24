import type { BridgeChainId } from "@/lib/bridgeChains";

/** Chain logos — CoinGecko CDN, same style as swap token icons. */
export const BRIDGE_CHAIN_LOGOS: Record<BridgeChainId, string> = {
  1: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  8453: "https://assets.coingecko.com/coins/images/37943/small/base.png",
  42161: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  59144: "https://assets.coingecko.com/coins/images/33904/small/linea.png",
  324: "https://assets.coingecko.com/asset_platforms/images/129/small/zksync.jpeg",
  56: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
};

export const BRIDGE_CHAIN_ACCENT: Record<BridgeChainId, string> = {
  1: "from-slate-400/40 to-slate-600/30 text-slate-100",
  8453: "from-blue-500/40 to-blue-700/30 text-blue-100",
  42161: "from-sky-400/40 to-blue-600/30 text-sky-100",
  59144: "from-emerald-400/40 to-teal-600/30 text-emerald-100",
  324: "from-violet-400/40 to-purple-600/30 text-violet-100",
  56: "from-amber-400/40 to-yellow-600/30 text-amber-100",
};

export function bridgeChainLogo(chainId: BridgeChainId): string {
  return BRIDGE_CHAIN_LOGOS[chainId];
}
