export type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  baseToken?: {
    address?: string;
    symbol?: string;
  };
  quoteToken?: {
    symbol?: string;
  };
  priceUsd?: string;
  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  volume?: {
    h24?: number;
  };
  liquidity?: {
    usd?: number;
  };
  marketCap?: number;
  fdv?: number;
};

export type CmcUsdQuote = {
  price?: number;
  volume_24h?: number;
  percent_change_24h?: number;
  market_cap?: number;
};

type CmcEntry = {
  slug?: string;
  quote?: {
    USD?: CmcUsdQuote;
  };
};

export function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildSparkline(price: number | null, changes: DexPair["priceChange"] | undefined | null) {
  if (!price || price <= 0) return [];

  const h24 = changes?.h24 ?? 0;
  const h6 = changes?.h6 ?? h24 * 0.65;
  const h1 = changes?.h1 ?? h6 * 0.35;
  const m5 = changes?.m5 ?? h1 * 0.2;

  return [h24, h6, h1, m5, 0].map((change) => {
    const divisor = 1 + change / 100;
    return divisor > 0 ? price / divisor : price;
  });
}

export function pickBestPair(pairs: DexPair[], tokenAddress: string) {
  const lower = tokenAddress.toLowerCase();
  const matching = pairs.filter(
    (pair) =>
      pair.chainId === "base" &&
      pair.baseToken?.address?.toLowerCase() === lower
  );

  return matching.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

export function parseCmcBody(body: unknown): Record<string, CmcUsdQuote> {
  const bySlug: Record<string, CmcUsdQuote> = {};
  if (!body || typeof body !== "object") return bySlug;

  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return bySlug;

  for (const entry of Object.values(data as Record<string, CmcEntry>)) {
    if (!entry || typeof entry !== "object") continue;
    const slug = entry.slug;
    const usd = entry.quote?.USD;
    if (typeof slug === "string" && usd && typeof usd === "object") {
      bySlug[slug.toLowerCase()] = usd;
    }
  }

  return bySlug;
}
