import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getBridgeChain, RELAY_NATIVE } from "@/lib/bridgeChains";

const RELAY_QUOTE_URL = "https://api.relay.link/quote/v2";

export async function POST(request: Request) {
  let body: {
    user?: string;
    originChainId?: number;
    destinationChainId?: number;
    originCurrency?: string;
    destinationCurrency?: string;
    amount?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const {
    user,
    originChainId,
    destinationChainId,
    originCurrency,
    destinationCurrency,
    amount,
  } = body;

  if (!user || !isAddress(user)) {
    return NextResponse.json({ error: "invalid_user" }, { status: 400 });
  }
  if (!originChainId || !destinationChainId || originChainId === destinationChainId) {
    return NextResponse.json({ error: "invalid_chains" }, { status: 400 });
  }
  if (!amount || !/^\d+$/.test(amount) || amount === "0") {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const fromChain = getBridgeChain(originChainId);
  const toChain = getBridgeChain(destinationChainId);
  if (!fromChain || !toChain) {
    return NextResponse.json({ error: "unsupported_chain" }, { status: 400 });
  }

  let originCur = originCurrency ?? RELAY_NATIVE;
  let destCur = destinationCurrency ?? RELAY_NATIVE;
  try {
    if (originCur.toLowerCase() !== RELAY_NATIVE.toLowerCase()) {
      originCur = getAddress(originCur);
    }
    if (destCur.toLowerCase() !== RELAY_NATIVE.toLowerCase()) {
      destCur = getAddress(destCur);
    }
  } catch {
    return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
  }

  const payload = {
    user: getAddress(user),
    recipient: getAddress(user),
    originChainId,
    destinationChainId,
    originCurrency: originCur,
    destinationCurrency: destCur,
    amount,
    tradeType: "EXACT_INPUT",
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const relayKey = process.env.RELAY_API_KEY?.trim();
  if (relayKey) headers["x-api-key"] = relayKey;

  try {
    const res = await fetch(RELAY_QUOTE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: json?.message ?? json?.error ?? "relay_quote_failed",
          details: json,
        },
        { status: res.status }
      );
    }
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "relay_unreachable" }, { status: 502 });
  }
}
