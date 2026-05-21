import { NextResponse } from "next/server";
import { fetchOnchainScore } from "@/lib/onchainScoreFetch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json({ error: "missing_address" }, { status: 400 });
  }

  try {
    const payload = await fetchOnchainScore(address);
    if (!payload) {
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
