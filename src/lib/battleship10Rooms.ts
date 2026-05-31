import {
  BATTLESHIP10_STATUS,
  isFreeStake,
  type Battleship10GameView,
  type Battleship10Status,
} from "@/lib/battleship10";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export const ROOM_LIST_LIMIT = 32;

export type Battleship10RawGame = {
  playerX: `0x${string}`;
  playerO: `0x${string}`;
  stakeWei: bigint;
  status: number;
  winner: `0x${string}`;
  turn: number;
  shipsX: bigint;
  shipsO: bigint;
  shotsX: bigint;
  shotsO: bigint;
  hitsX: bigint;
  hitsO: bigint;
  placedX: boolean;
  placedO: boolean;
  lastMoveAt: number;
};

export function parseGetGameResult(gameId: bigint, raw: Battleship10RawGame): Battleship10GameView {
  return {
    gameId,
    playerX: raw.playerX,
    playerO: raw.playerO,
    stakeWei: raw.stakeWei,
    status: BATTLESHIP10_STATUS[Number(raw.status)] ?? "open",
    winner: raw.winner,
    turn: Number(raw.turn) === 1 ? 1 : 0,
    shipsX: raw.shipsX,
    shipsO: raw.shipsO,
    shotsX: raw.shotsX,
    shotsO: raw.shotsO,
    hitsX: raw.hitsX,
    hitsO: raw.hitsO,
    placedX: raw.placedX,
    placedO: raw.placedO,
    lastMoveAt: Number(raw.lastMoveAt),
  };
}

export function hasPlayerO(playerO: string): boolean {
  return playerO.toLowerCase() !== ZERO_ADDRESS;
}

export function roomOccupancy(game: Pick<Battleship10GameView, "playerO" | "status">): "1/0" | "1/1" {
  return hasPlayerO(game.playerO) ? "1/1" : "1/0";
}

export function recentRoomIds(nextGameId: bigint | undefined, limit = ROOM_LIST_LIMIT): bigint[] {
  if (nextGameId == null || nextGameId <= BigInt(1)) return [];
  const latest = nextGameId - BigInt(1);
  const count = Number(latest);
  const take = Math.min(limit, count);
  const start = latest - BigInt(take - 1);
  const ids: bigint[] = [];
  for (let id = start; id <= latest; id++) {
    ids.push(id);
  }
  return ids.reverse();
}

export function isLiveRoom(game: Battleship10GameView): boolean {
  return game.status === "open" || game.status === "placing" || game.status === "active";
}

export function isPastRoom(game: Battleship10GameView): boolean {
  return game.status === "finished" || game.status === "cancelled";
}

export function sortPastRooms(a: Battleship10GameView, b: Battleship10GameView): number {
  return Number(b.gameId - a.gameId);
}

export function historySummary(game: Battleship10GameView): string {
  if (game.status === "cancelled") {
    return isFreeStake(game.stakeWei) ? "closed · idle" : "cancelled";
  }
  if (game.winner.toLowerCase() === game.playerX.toLowerCase()) return "host won";
  if (hasPlayerO(game.playerO) && game.winner.toLowerCase() === game.playerO.toLowerCase()) {
    return "guest won";
  }
  return "ended";
}

export function canEnterRoom(game: Battleship10GameView, wallet: string | undefined): boolean {
  if (isPastRoom(game)) return false;
  if (!wallet) return false;
  const me = wallet.toLowerCase();
  if (game.playerX.toLowerCase() === me) return true;
  return hasPlayerO(game.playerO) && game.playerO.toLowerCase() === me;
}

export function matchesPlayStyle(game: Battleship10GameView, playStyle: "fun" | "money"): boolean {
  return playStyle === "fun" ? isFreeStake(game.stakeWei) : !isFreeStake(game.stakeWei);
}

export function sortLobbyRooms(a: Battleship10GameView, b: Battleship10GameView): number {
  const openFirst = (g: Battleship10GameView) => (g.status === "open" ? 0 : 1);
  const byStatus = openFirst(a) - openFirst(b);
  if (byStatus !== 0) return byStatus;
  const byOcc = roomOccupancy(a) === "1/0" ? -1 : roomOccupancy(b) === "1/0" ? 1 : 0;
  if (byOcc !== 0) return byOcc;
  return Number(b.gameId - a.gameId);
}

export function statusLabel(status: Battleship10Status): string {
  if (status === "open") return "waiting";
  if (status === "placing") return "placing ships";
  if (status === "active") return "battle";
  return status;
}

export function myPlaced(
  game: Battleship10GameView,
  role: "host" | "guest" | null
): boolean {
  if (role === "host") return game.placedX;
  if (role === "guest") return game.placedO;
  return false;
}

export function opponentPlaced(
  game: Battleship10GameView,
  role: "host" | "guest" | null
): boolean {
  if (role === "host") return game.placedO;
  if (role === "guest") return game.placedX;
  return false;
}
