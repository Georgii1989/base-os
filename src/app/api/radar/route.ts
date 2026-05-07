import { NextResponse } from "next/server";
import { radarProjects } from "@/lib/radarProjects";

export const revalidate = 60;

type DexPair = {
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

type DefiLlamaCoin = {
  symbol?: string;
  price?: number;
  timestamp?: number;
  confidence?: number;
};

type CmcUsdQuote = {
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

type CmcFetchResult =
  | { attempted: false }
  | { attempted: true; ok: boolean; bySlug: Record<string, CmcUsdQuote> };

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildSparkline(price: number | null, changes: DexPair["priceChange"] | undefined | null) {
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

function pickBestPair(pairs: DexPair[], tokenAddress: string) {
  const lower = tokenAddress.toLowerCase();
  const matching = pairs.filter(
    (pair) =>
      pair.chainId === "base" &&
      pair.baseToken?.address?.toLowerCase() === lower
  );

  return matching.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

function parseCmcBody(body: unknown): Record<string, CmcUsdQuote> {
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

async function fetchCoinMarketCap(slugs: string[]): Promise<CmcFetchResult> {
  const key = process.env.COINMARKETCAP_API_KEY;
  if (!key || slugs.length === 0) {
    return { attempted: false };
  }

  const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${slugs.join(",")}`;

  try {
    const res = await fetch(url, {
      headers: { "X-CMC_PRO_API_KEY": key },
      next: { revalidate },
    });

    if (!res.ok) {
      return { attempted: true, ok: false, bySlug: {} };
    }

    const json = (await res.json()) as { status?: { error_code?: number } };
    if (json.status?.error_code) {
      return { attempted: true, ok: false, bySlug: {} };
    }

    const bySlug = parseCmcBody(json);
    const ok = Object.keys(bySlug).length > 0;
    return { attempted: true, ok, bySlug };
  } catch {
    return { attempted: true, ok: false, bySlug: {} };
  }
}

export async function GET() {
  const tokenProjects = radarProjects.filter((project) => project.tokenAddress);
  const addresses = tokenProjects.map((project) => project.tokenAddress).join(",");
  if (!addresses) {
    return NextResponse.json({ updatedAt: new Date().toISOString(), data: [] });
  }

  const cmcSlugList = [...new Set(tokenProjects.map((p) => p.cmcSlug).filter(Boolean))] as string[];

  const [dexOutcome, llamaOutcome, cmcOutcome] = await Promise.allSettled([
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`, {
      next: { revalidate },
    }),
    fetch(
      `https://coins.llama.fi/prices/current/${tokenProjects
        .map((project) => `base:${project.tokenAddress}`)
        .join(",")}`,
      { next: { revalidate } }
    ),
    fetchCoinMarketCap(cmcSlugList),
  ]);

  let pairs: DexPair[] = [];
  const dexOk = dexOutcome.status === "fulfilled" && dexOutcome.value.ok === true;

  if (dexOk && dexOutcome.status === "fulfilled") {
    const dexJson = (await dexOutcome.value.json()) as { pairs?: DexPair[] };
    pairs = dexJson.pairs ?? [];
  }

  let llamaPrices: Record<string, DefiLlamaCoin> = {};
  const llamaOk = llamaOutcome.status === "fulfilled" && llamaOutcome.value.ok === true;

  if (llamaOk && llamaOutcome.status === "fulfilled") {
    const llamaJson = (await llamaOutcome.value.json()) as {
      coins?: Record<string, DefiLlamaCoin>;
    };
    llamaPrices = llamaJson.coins ?? {};
  }

  const cmcResult: CmcFetchResult =
    cmcOutcome.status === "fulfilled"
      ? cmcOutcome.value
      : { attempted: true, ok: false, bySlug: {} };

  let cmcBySlug: Record<string, CmcUsdQuote> = {};
  let cmcOk = false;

  if (cmcResult.attempted) {
    cmcOk = cmcResult.ok;
    cmcBySlug = cmcResult.bySlug;
  }

  const hasAnyUpstream = dexOk || llamaOk || (cmcResult.attempted && cmcOk);

  if (!hasAnyUpstream) {
    return NextResponse.json({ error: "Unable to load live market data." }, { status: 502 });
  }

  const data = tokenProjects.map((project) => {
    const bestPair = pickBestPair(pairs, project.tokenAddress as `0x${string}`);
    const llamaCoin = llamaPrices[`base:${project.tokenAddress}`];

    const cmcUsd =
      project.cmcSlug && typeof project.cmcSlug === "string"
        ? cmcBySlug[project.cmcSlug.toLowerCase()]
        : undefined;

    const dexPrice = numberOrNull(bestPair?.priceUsd);
    const llamaPrice = numberOrNull(llamaCoin?.price);
    const cmcPrice = numberOrNull(cmcUsd?.price);
    const price = dexPrice ?? llamaPrice ?? cmcPrice;

    const changeFromPair = numberOrNull(bestPair?.priceChange?.h24);
    const changeFromCmc = numberOrNull(cmcUsd?.percent_change_24h);
    const change24h = changeFromPair ?? changeFromCmc;

    const volume24h =
      numberOrNull(bestPair?.volume?.h24) ?? numberOrNull(cmcUsd?.volume_24h);

    const dexMc = numberOrNull(bestPair?.marketCap ?? bestPair?.fdv);
    const cmcMc = numberOrNull(cmcUsd?.market_cap);
    const marketCap = dexMc ?? cmcMc;

    let dexLabel: string | null = null;
    if (bestPair?.dexId) dexLabel = bestPair.dexId;
    else if (dexPrice === null && llamaPrice !== null) dexLabel = "defillama";
    else if (dexPrice === null && llamaPrice === null && cmcPrice !== null) dexLabel = "coinmarketcap";

    const sparkChangeSource =
      bestPair?.priceChange ??
      (changeFromCmc !== null ? { h24: changeFromCmc } : undefined);

    return {
      id: project.id,
      symbol: project.symbol,
      priceUsd: price,
      change24h,
      volume24h,
      liquidityUsd: numberOrNull(bestPair?.liquidity?.usd),
      marketCap,
      dex: dexLabel,
      pairUrl: bestPair?.url ?? null,
      sparkline: buildSparkline(price, sparkChangeSource ?? null),
    };
  });

  return NextResponse.json({ updatedAt: new Date().toISOString(), data });
}
