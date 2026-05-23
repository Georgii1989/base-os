import { NextResponse } from "next/server";
import {
  lookupSwapTokenByAddress,
  normalizeAddressQuery,
  searchSwapTokens,
} from "@/lib/swapTokenLookup";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? searchParams.get("address")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const addr = normalizeAddressQuery(q);
  if (addr) {
    const token = await lookupSwapTokenByAddress(addr);
    if (!token) {
      return NextResponse.json({ error: "token_not_found" }, { status: 404 });
    }
    return NextResponse.json({ tokens: [token] });
  }

  const tokens = await searchSwapTokens(q, 15);
  return NextResponse.json({ tokens });
}
