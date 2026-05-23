import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { isNativeEthToken, type SwapQuoteResponse } from "@/lib/swapTokens";

const BASE_CHAIN_ID = "8453";
const ZEROX_QUOTE_URL = "https://api.0x.org/swap/allowance-holder/quote";

type ZeroXQuote = {
  buyAmount?: string;
  sellAmount?: string;
  buyToken?: string;
  sellToken?: string;
  estimatedGas?: string;
  transaction?: {
    to?: string;
    data?: string;
    value?: string;
    gas?: string;
  };
  allowanceTarget?: string;
  issues?: {
    allowance?: { spender?: string } | null;
    balance?: unknown;
  };
  reason?: string;
  message?: string;
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.ZEROX_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Swap quotes are not configured.",
        hint: "Add ZEROX_API_KEY from docs.0x.org (free tier) to env.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const sellTokenRaw = searchParams.get("sellToken");
  const buyTokenRaw = searchParams.get("buyToken");
  const sellAmount = searchParams.get("sellAmount");
  const takerRaw = searchParams.get("taker");

  if (!sellTokenRaw || !buyTokenRaw || !sellAmount || !takerRaw) {
    return NextResponse.json({ error: "Missing sellToken, buyToken, sellAmount, or taker." }, { status: 400 });
  }

  if (!/^\d+$/.test(sellAmount) || sellAmount === "0") {
    return NextResponse.json({ error: "Invalid sellAmount." }, { status: 400 });
  }

  if (!isAddress(takerRaw)) {
    return NextResponse.json({ error: "Invalid taker address." }, { status: 400 });
  }

  let sellToken: string;
  let buyToken: string;
  try {
    sellToken = isNativeEthToken(sellTokenRaw) ? sellTokenRaw : getAddress(sellTokenRaw);
    buyToken = isNativeEthToken(buyTokenRaw) ? buyTokenRaw : getAddress(buyTokenRaw);
  } catch {
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });
  }

  if (sellToken.toLowerCase() === buyToken.toLowerCase()) {
    return NextResponse.json({ error: "Sell and buy tokens must differ." }, { status: 400 });
  }

  const taker = getAddress(takerRaw);
  const url = new URL(ZEROX_QUOTE_URL);
  url.searchParams.set("chainId", BASE_CHAIN_ID);
  url.searchParams.set("sellToken", sellToken);
  url.searchParams.set("buyToken", buyToken);
  url.searchParams.set("sellAmount", sellAmount);
  url.searchParams.set("taker", taker);
  url.searchParams.set("slippageBps", "100");

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        "0x-api-key": apiKey,
        "0x-version": "v2",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach 0x quote API." }, { status: 502 });
  }

  const json = (await upstream.json()) as ZeroXQuote;

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: json.reason ?? json.message ?? "Quote failed.",
        hint: "Try a smaller amount or another pair. Low-liquidity tokens may fail.",
      },
      { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 }
    );
  }

  const tx = json.transaction;
  if (!tx?.to || !tx.data || tx.value == null || !json.buyAmount) {
    return NextResponse.json({ error: "Incomplete quote from aggregator." }, { status: 502 });
  }

  const needsApproval =
    Boolean(json.issues?.allowance) &&
    !isNativeEthToken(sellToken) &&
    Boolean(json.allowanceTarget);

  const payload: SwapQuoteResponse = {
    buyAmount: json.buyAmount,
    sellAmount: json.sellAmount ?? sellAmount,
    buyToken,
    sellToken,
    estimatedGas: json.estimatedGas ?? tx.gas ?? null,
    allowanceTarget: json.allowanceTarget ? getAddress(json.allowanceTarget) : null,
    needsApproval,
    transaction: {
      to: getAddress(tx.to),
      data: tx.data as `0x${string}`,
      value: tx.value,
      gas: tx.gas ?? null,
    },
  };

  return NextResponse.json(payload);
}
