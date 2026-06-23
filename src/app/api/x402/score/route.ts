import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getFacilitatorResponseError } from "@x402/core/server";
import { withX402 } from "@x402/next";
import { isX402SellerConfigured } from "@/lib/x402/config";
import { handleOnchainScoreRequest } from "@/lib/x402/onchainScoreHandler";
import { buildX402ScoreRouteConfig, getX402ResourceServer } from "@/lib/x402/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scoreHandler(request: NextRequest): Promise<NextResponse> {
  return handleOnchainScoreRequest(request);
}

const routeConfig = buildX402ScoreRouteConfig();
const server = getX402ResourceServer();

const protectedGet =
  routeConfig && server ? withX402(scoreHandler, routeConfig, server) : null;

function facilitatorErrorResponse(error: unknown) {
  const facilitatorError = getFacilitatorResponseError(error);
  const message = facilitatorError?.message ?? (error instanceof Error ? error.message : "x402_facilitator_error");
  const unauthorized = /401|unauthorized/i.test(message);
  return NextResponse.json(
    {
      error: "x402_facilitator_error",
      hint: unauthorized
        ? "CDP facilitator rejected the API key. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET on the server."
        : message,
    },
    { status: 502 }
  );
}

export async function GET(request: NextRequest) {
  if (!isX402SellerConfigured() || !protectedGet) {
    return NextResponse.json(
      {
        error: "x402_not_configured",
        hint: "Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and X402_PAY_TO_ADDRESS on the server.",
      },
      { status: 503 }
    );
  }

  try {
    return await protectedGet(request);
  } catch (error) {
    console.error("[x402/score]", error);
    return facilitatorErrorResponse(error);
  }
}
