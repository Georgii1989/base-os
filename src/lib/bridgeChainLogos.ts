import type { BridgeChainId } from "@/lib/bridgeChains";

/** Brand circle behind logo (Arbitrum-style chips). */
export const BRIDGE_CHAIN_BG: Record<BridgeChainId, string> = {
  1: "#627EEA",
  8453: "#0052FF",
  42161: "#213147",
  59144: "#121212",
  324: "#4E529A",
  56: "#F3BA2F",
};

/** Local SVGs first — always load; CDN as backup. */
export const BRIDGE_CHAIN_LOGO_SOURCES: Record<BridgeChainId, string[]> = {
  1: ["/chains/ethereum.svg", "https://assets.coingecko.com/coins/images/279/small/ethereum.png"],
  8453: ["/chains/base.svg", "https://assets.coingecko.com/coins/images/37943/small/base.png"],
  42161: [
    "/chains/arbitrum.svg",
    "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  ],
  59144: ["/chains/linea.svg", "https://assets.coingecko.com/coins/images/33904/small/linea.png"],
  324: [
    "/chains/zksync.svg",
    "https://assets.coingecko.com/asset_platforms/images/129/small/zksync.jpeg",
  ],
  56: ["/chains/bnb.svg", "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png"],
};

export const BRIDGE_CHAIN_ACCENT: Record<BridgeChainId, string> = {
  1: "from-[#627EEA]/50 to-[#627EEA]/20 text-white",
  8453: "from-[#0052FF]/50 to-[#0052FF]/20 text-white",
  42161: "from-[#28A0F0]/50 to-[#213147]/40 text-white",
  59144: "from-[#61DFFF]/40 to-[#121212]/60 text-[#61DFFF]",
  324: "from-[#8C8DFC]/50 to-[#4E529A]/40 text-white",
  56: "from-[#F3BA2F]/50 to-[#F3BA2F]/20 text-[#1a1a1a]",
};

export function bridgeChainLogoSources(chainId: BridgeChainId): string[] {
  return BRIDGE_CHAIN_LOGO_SOURCES[chainId];
}

/** @deprecated use bridgeChainLogoSources */
export function bridgeChainLogo(chainId: BridgeChainId): string {
  return BRIDGE_CHAIN_LOGO_SOURCES[chainId][0] ?? "";
}

export const BRIDGE_CHAIN_LOGOS: Record<BridgeChainId, string> = {
  1: BRIDGE_CHAIN_LOGO_SOURCES[1][0],
  8453: BRIDGE_CHAIN_LOGO_SOURCES[8453][0],
  42161: BRIDGE_CHAIN_LOGO_SOURCES[42161][0],
  59144: BRIDGE_CHAIN_LOGO_SOURCES[59144][0],
  324: BRIDGE_CHAIN_LOGO_SOURCES[324][0],
  56: BRIDGE_CHAIN_LOGO_SOURCES[56][0],
};
