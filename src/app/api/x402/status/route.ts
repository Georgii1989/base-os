import { NextResponse } from "next/server";
import { x402PublicStatus } from "@/lib/x402/config";
import { probeX402Facilitator } from "@/lib/x402/facilitatorHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const facilitator = await probeX402Facilitator();
  return NextResponse.json({
    ...x402PublicStatus(),
    facilitatorReady: facilitator.ok,
    facilitatorError: facilitator.ok ? null : facilitator.error,
  });
}
