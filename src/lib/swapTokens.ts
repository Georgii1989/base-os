/** 0x native ETH sentinel (not WETH). */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export type SwapTokenPreset = {
  id: string;
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
};

export const SWAP_TOKEN_PRESETS: SwapTokenPreset[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ether",
    address: NATIVE_ETH,
    decimals: 18,
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    decimals: 6,
  },
  {
    id: "weth",
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
  },
  {
    id: "degen",
    symbol: "DEGEN",
    name: "Degen",
    address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
    decimals: 18,
  },
];

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
      name: "Custom token",
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
