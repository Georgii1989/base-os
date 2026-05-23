import { NextResponse } from "next/server";
import { BASE_TOP_SWAP_TOKENS } from "@/lib/swapBaseTokens";
import { isNativeEthToken } from "@/lib/swapTokens";

export const revalidate = 60;

type LlamaCoin = { price?: number };

export async function GET() {
  const keys = BASE_TOP_SWAP_TOKENS.map((t) =>
    isNativeEthToken(t.address) ? "coingecko:ethereum" : `base:${t.address}`
  );

  const prices: Record<string, number> = {};

  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${keys.join(",")}`, {
      next: { revalidate },
    });
    if (res.ok) {
      const json = (await res.json()) as { coins?: Record<string, LlamaCoin> };
      for (const token of BASE_TOP_SWAP_TOKENS) {
        const key = isNativeEthToken(token.address)
          ? "coingecko:ethereum"
          : `base:${token.address}`;
        const p = json.coins?.[key]?.price;
        if (typeof p === "number" && p > 0) {
          prices[token.address.toLowerCase()] = p;
        }
      }
    }
  } catch {
    // leave prices empty
  }

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    prices,
  });
}
