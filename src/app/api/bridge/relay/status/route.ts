import { NextResponse } from "next/server";

const RELAY_STATUS_BASE = "https://api.relay.link";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId")?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "missing_request_id" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  const relayKey = process.env.RELAY_API_KEY?.trim();
  if (relayKey) headers["x-api-key"] = relayKey;

  try {
    const res = await fetch(
      `${RELAY_STATUS_BASE}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`,
      { headers, next: { revalidate: 0 } }
    );
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "relay_unreachable" }, { status: 502 });
  }
}
