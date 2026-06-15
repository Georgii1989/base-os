import { generateGameInviteOgImage, parseGameInviteTab } from "@/lib/gameInviteOgImage";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? searchParams.get("game") ?? "game";
  const room = searchParams.get("room")?.trim() || "—";
  const kind = parseGameInviteTab(tab) ?? "grid646";
  return generateGameInviteOgImage(kind, room);
}
