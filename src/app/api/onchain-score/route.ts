import { NextResponse } from "next/server";
import { handleOnchainScoreRequest } from "@/lib/x402/onchainScoreHandler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleOnchainScoreRequest(request);
}
