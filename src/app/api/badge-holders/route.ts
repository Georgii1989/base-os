import { NextResponse } from "next/server";
import { fetchBadgeHolders } from "@/lib/badgeHoldersFetch";

export const maxDuration = 30;

export async function GET() {
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS?.trim();
  if (!sbtAddress) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 404 });
  }

  try {
    const holders = await fetchBadgeHolders(sbtAddress);
    return NextResponse.json(
      { ok: true as const, holders, source: "blockscout" as const },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
