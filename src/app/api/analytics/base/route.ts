import { NextResponse } from "next/server";
import { fetchAnalyticsBySource } from "@/lib/analytics/providers";
import { parseAnalyticsSource } from "@/lib/analyticsSources";

export const dynamic = "force-dynamic";
export const revalidate = 300;
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = parseAnalyticsSource(searchParams.get("source"));

  const payload = await fetchAnalyticsBySource(source);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
