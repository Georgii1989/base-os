import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { fetchWalletPortfolio } from "@/lib/walletPortfolioFetch";

type Props = { params: Promise<{ address: string }> };

export const maxDuration = 30;

export async function GET(_request: Request, context: Props) {
  const { address: raw } = await context.params;
  if (!isAddress(raw)) {
    return NextResponse.json({ ok: false, error: "invalid_address" }, { status: 400 });
  }

  try {
    const checksum = getAddress(raw);
    const portfolio = await fetchWalletPortfolio(checksum);
    return NextResponse.json(
      { ok: true as const, portfolio },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
