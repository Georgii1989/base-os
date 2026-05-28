import { NextResponse } from "next/server";

export type RematchVote = "yes" | "no";

type RoomVotes = { x?: RematchVote; o?: RematchVote; updated: number };

const store = new Map<string, RoomVotes>();

function prune() {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24;
  for (const [id, v] of store.entries()) {
    if (v.updated < cutoff) store.delete(id);
  }
}

export async function GET(request: Request) {
  const gameId = new URL(request.url).searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }
  prune();
  const votes = store.get(gameId) ?? {};
  return NextResponse.json(votes);
}

export async function POST(request: Request) {
  let body: { gameId?: string; role?: string; vote?: string };
  try {
    body = (await request.json()) as { gameId?: string; role?: string; vote?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gameId, role, vote } = body;
  if (!gameId || (role !== "X" && role !== "O") || (vote !== "yes" && vote !== "no")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const current = store.get(gameId) ?? { updated: Date.now() };
  if (role === "X") current.x = vote;
  else current.o = vote;
  current.updated = Date.now();
  store.set(gameId, current);

  return NextResponse.json(current);
}
