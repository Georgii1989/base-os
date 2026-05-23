/** Native currency sentinel for Relay API. */
export const RELAY_NATIVE = "0x0000000000000000000000000000000000000000" as const;

export type BridgeChainId = 1 | 56 | 42161 | 59144 | 324 | 8453;

export type BridgeTokenId = "eth" | "usdc";

export type BridgeChainConfig = {
  id: BridgeChainId;
  name: string;
  shortName: string;
  nativeSymbol: string;
  txExplorer: string;
  /** Superbridge / bridge.base.org compatible (OP Stack canonical). */
  officialBridge: boolean;
  tokens: Record<
    BridgeTokenId,
    {
      symbol: string;
      address: `0x${string}`;
      decimals: number;
    }
  >;
};

export const BRIDGE_CHAINS: BridgeChainConfig[] = [
  {
    id: 8453,
    name: "Base",
    shortName: "Base",
    nativeSymbol: "ETH",
    txExplorer: "https://basescan.org",
    officialBridge: true,
    tokens: {
      eth: { symbol: "ETH", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        decimals: 6,
      },
    },
  },
  {
    id: 1,
    name: "Ethereum",
    shortName: "ETH",
    nativeSymbol: "ETH",
    txExplorer: "https://etherscan.io",
    officialBridge: true,
    tokens: {
      eth: { symbol: "ETH", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
    },
  },
  {
    id: 42161,
    name: "Arbitrum",
    shortName: "ARB",
    nativeSymbol: "ETH",
    txExplorer: "https://arbiscan.io",
    officialBridge: true,
    tokens: {
      eth: { symbol: "ETH", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
      },
    },
  },
  {
    id: 59144,
    name: "Linea",
    shortName: "Linea",
    nativeSymbol: "ETH",
    txExplorer: "https://lineascan.build",
    officialBridge: true,
    tokens: {
      eth: { symbol: "ETH", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0x176211869cA2bCb2F25FE9336982250e8e76C3Ca",
        decimals: 6,
      },
    },
  },
  {
    id: 324,
    name: "zkSync Era",
    shortName: "zkSync",
    nativeSymbol: "ETH",
    txExplorer: "https://explorer.zksync.io",
    officialBridge: true,
    tokens: {
      eth: { symbol: "ETH", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0x1d17CBcF0D6D131135aE68c275B4dFB1d8e7E7A0",
        decimals: 6,
      },
    },
  },
  {
    id: 56,
    name: "BNB Chain",
    shortName: "BNB",
    nativeSymbol: "BNB",
    txExplorer: "https://bscscan.com",
    officialBridge: false,
    tokens: {
      eth: { symbol: "BNB", address: RELAY_NATIVE, decimals: 18 },
      usdc: {
        symbol: "USDC",
        address: "0x8AC76a51cc950d9822D186bEef40aB4E73A9d706",
        decimals: 18,
      },
    },
  },
];

export function getBridgeChain(id: number): BridgeChainConfig | undefined {
  return BRIDGE_CHAINS.find((c) => c.id === id);
}

export function defaultBridgePair(fromId: BridgeChainId): BridgeChainId {
  return fromId === 8453 ? 1 : 8453;
}

/** Official Base bridge UI — Ethereum uses bridge.base.org, L2s use Superbridge. */
export function officialBridgeUrl(fromChainId: BridgeChainId, toChainId: BridgeChainId): string {
  if (fromChainId === 1 && toChainId === 8453) {
    return "https://bridge.base.org/deposit";
  }
  if (fromChainId === 8453 && toChainId === 1) {
    return "https://bridge.base.org/withdraw";
  }
  return `https://superbridge.app/?fromChainId=${fromChainId}&toChainId=${toChainId}`;
}
