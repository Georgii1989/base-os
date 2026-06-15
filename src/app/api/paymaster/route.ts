import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cdpPaymasterRpcUrl(): string | null {
  const direct = process.env.CDP_PAYMASTER_RPC_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");

  const apiKey = process.env.CDP_API_KEY?.trim();
  if (!apiKey) return null;
  return `https://api.developer.coinbase.com/rpc/v1/base/${apiKey}`;
}

export async function GET() {
  const rpc = cdpPaymasterRpcUrl();
  return NextResponse.json({
    enabled: Boolean(rpc),
    url: rpc ? "/api/paymaster" : null,
  });
}

/** Proxy ERC-7677 / CDP Paymaster RPC — keeps API key server-side. */
export async function POST(request: Request) {
  const rpc = cdpPaymasterRpcUrl();
  if (!rpc) {
    return NextResponse.json({ error: "paymaster_not_configured" }, { status: 501 });
  }

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return NextResponse.json({ error: "paymaster_unreachable" }, { status: 502 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
