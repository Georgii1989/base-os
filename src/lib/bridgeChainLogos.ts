import type { BridgeChainId } from "@/lib/bridgeChains";

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

/** Official chain logos (Trust Wallet assets), bundled in /public/chains. */
export const BRIDGE_CHAIN_LOGO_SOURCES: Record<BridgeChainId, string[]> = {
  1: ["/chains/ethereum.png", `${TW}/ethereum/info/logo.png`],
  8453: ["/chains/base.png", `${TW}/base/info/logo.png`],
  42161: ["/chains/arbitrum.png", `${TW}/arbitrum/info/logo.png`],
  59144: ["/chains/linea.png", `${TW}/linea/info/logo.png`],
  324: ["/chains/zksync.png", `${TW}/zksync/info/logo.png`],
  56: ["/chains/bnb.png", `${TW}/smartchain/info/logo.png`],
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

export function bridgeChainLogo(chainId: BridgeChainId): string {
  return BRIDGE_CHAIN_LOGO_SOURCES[chainId][0] ?? "";
}

export const BRIDGE_CHAIN_LOGOS: Record<BridgeChainId, string> = {
  1: "/chains/ethereum.png",
  8453: "/chains/base.png",
  42161: "/chains/arbitrum.png",
  59144: "/chains/linea.png",
  324: "/chains/zksync.png",
  56: "/chains/bnb.png",
};
