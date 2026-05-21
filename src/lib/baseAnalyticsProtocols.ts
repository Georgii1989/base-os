/** Curated DeFi Llama protocol slugs — Base TVL + DEX volume where applicable. */
export type ProtocolMeta = {
  slug: string;
  name: string;
  category: "DEX" | "Lending" | "Yield" | "Bridge" | "Derivatives";
};

export const BASE_ANALYTICS_PROTOCOLS: readonly ProtocolMeta[] = [
  { slug: "aerodrome-slipstream", name: "Aerodrome", category: "DEX" },
  { slug: "uniswap-v3", name: "Uniswap V3", category: "DEX" },
  { slug: "curve-dex", name: "Curve", category: "DEX" },
  { slug: "balancer-v2", name: "Balancer V2", category: "DEX" },
  { slug: "sushiswap", name: "SushiSwap", category: "DEX" },
  { slug: "pancakeswap-amm", name: "PancakeSwap", category: "DEX" },
  { slug: "baseswap", name: "BaseSwap", category: "DEX" },
  { slug: "maverick-protocol", name: "Maverick", category: "DEX" },
  { slug: "dodo", name: "DODO", category: "DEX" },
  { slug: "morpho", name: "Morpho", category: "Lending" },
  { slug: "aave-v3", name: "Aave V3", category: "Lending" },
  { slug: "moonwell-lending", name: "Moonwell", category: "Lending" },
  { slug: "compound-v3", name: "Compound V3", category: "Lending" },
  { slug: "seamless-protocol", name: "Seamless", category: "Lending" },
  { slug: "euler", name: "Euler", category: "Lending" },
  { slug: "spark", name: "Spark", category: "Lending" },
  { slug: "extra-finance-leverage-farming", name: "Extra Finance", category: "Yield" },
  { slug: "beefy", name: "Beefy", category: "Yield" },
  { slug: "pendle", name: "Pendle", category: "Yield" },
  { slug: "yearn-finance", name: "Yearn", category: "Yield" },
  { slug: "stargate", name: "Stargate", category: "Bridge" },
  { slug: "across", name: "Across", category: "Bridge" },
  { slug: "ether.fi", name: "ether.fi", category: "Yield" },
  { slug: "apex-protocol", name: "ApeX", category: "Derivatives" },
] as const;
