export type AnalyticsSourceId = "defillama" | "l2beat" | "blockscout";

export type AnalyticsSourceMeta = {
  id: AnalyticsSourceId;
  label: string;
  description: string;
  href: string;
};

export const ANALYTICS_SOURCES: readonly AnalyticsSourceMeta[] = [
  {
    id: "defillama",
    label: "DeFi Llama",
    description: "TVL, DEX volume, fees, stablecoins, protocols",
    href: "https://defillama.com/chain/base",
  },
  {
    id: "l2beat",
    label: "L2BEAT",
    description: "L2 activity — daily transactions & UOPS on Base",
    href: "https://l2beat.com/scaling/projects/base",
  },
  {
    id: "blockscout",
    label: "Blockscout",
    description: "On-chain network stats — txs, addresses, gas",
    href: "https://base.blockscout.com",
  },
] as const;

const SOURCE_SET = new Set<AnalyticsSourceId>(ANALYTICS_SOURCES.map((s) => s.id));

export function parseAnalyticsSource(value: string | null | undefined): AnalyticsSourceId {
  const normalized = value?.trim().toLowerCase();
  if (normalized && SOURCE_SET.has(normalized as AnalyticsSourceId)) {
    return normalized as AnalyticsSourceId;
  }
  return "defillama";
}

export function getAnalyticsSourceMeta(id: AnalyticsSourceId): AnalyticsSourceMeta {
  return ANALYTICS_SOURCES.find((s) => s.id === id) ?? ANALYTICS_SOURCES[0];
}
