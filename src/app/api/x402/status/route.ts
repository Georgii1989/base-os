import { NextResponse } from "next/server";
import { x402PublicStatus } from "@/lib/x402/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(x402PublicStatus());
}
