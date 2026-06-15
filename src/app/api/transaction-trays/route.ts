import { NextResponse } from "next/server";
import { buildTransactionTrays, trayForRoom } from "@/lib/transactionTrays";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room")?.trim();
  const game = searchParams.get("game")?.trim();

  let trays = buildTransactionTrays();

  if (room && game === "grid646") {
    const tailored = trayForRoom(trays, "grid646_casual", room);
    trays = tailored ? [tailored] : trays;
  } else if (room && game === "battleship") {
    const tailored = trayForRoom(trays, "battleship_casual", room);
    trays = tailored ? [tailored] : trays;
  }

  return NextResponse.json({
    version: "1.0",
    chainId: 8453,
    trays,
    docs: "https://docs.base.org/base-app/agents/transaction-trays",
  });
}
