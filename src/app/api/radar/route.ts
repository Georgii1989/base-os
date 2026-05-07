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

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildSparkline(price: number | null, changes: DexPair["priceChange"]) {
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

export async function GET() {
  const tokenProjects = radarProjects.filter((project) => project.tokenAddress);
  const addresses = tokenProjects.map((project) => project.tokenAddress).join(",");
  if (!addresses) {
    return NextResponse.json({ updatedAt: new Date().toISOString(), data: [] });
  }

  const [dexResponse, llamaResponse] = await Promise.allSettled([
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`, {
      next: { revalidate },
    }),
    fetch(
      `https://coins.llama.fi/prices/current/${tokenProjects
        .map((project) => `base:${project.tokenAddress}`)
        .join(",")}`,
      { next: { revalidate } }
    ),
  ]);

  const dexOk = dexResponse.status === "fulfilled" && dexResponse.value.ok;
  const llamaOk = llamaResponse.status === "fulfilled" && llamaResponse.value.ok;

  if (!dexOk && !llamaOk) {
    return NextResponse.json(
      { error: "Unable to load live market data." },
      { status: 502 }
    );
  }

  const payload = dexOk ? ((await dexResponse.value.json()) as { pairs?: DexPair[] }) : {};
  const pairs = payload.pairs ?? [];
  const llamaPayload = llamaOk
    ? ((await llamaResponse.value.json()) as { coins?: Record<string, DefiLlamaCoin> })
    : {};
  const llamaPrices = llamaPayload.coins ?? {};

  const data = tokenProjects.map((project) => {
    const bestPair = pickBestPair(pairs, project.tokenAddress as `0x${string}`);
    const llamaCoin = llamaPrices[`base:${project.tokenAddress}`];
    const dexPrice = numberOrNull(bestPair?.priceUsd);
    const llamaPrice = numberOrNull(llamaCoin?.price);
    const price = dexPrice ?? llamaPrice;

    return {
      id: project.id,
      symbol: project.symbol,
      priceUsd: price,
      change24h: numberOrNull(bestPair?.priceChange?.h24),
      volume24h: numberOrNull(bestPair?.volume?.h24),
      liquidityUsd: numberOrNull(bestPair?.liquidity?.usd),
      marketCap: numberOrNull(bestPair?.marketCap ?? bestPair?.fdv),
      dex: bestPair?.dexId ?? (llamaPrice !== null ? "defillama" : null),
      pairUrl: bestPair?.url ?? null,
      sparkline: buildSparkline(price, bestPair?.priceChange),
    };
  });

  return NextResponse.json({ updatedAt: new Date().toISOString(), data });
}
