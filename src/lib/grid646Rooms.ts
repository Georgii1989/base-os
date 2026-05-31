import { GRID646_STATUS, isFreeStake, type Grid646GameView, type Grid646Status } from "@/lib/grid646";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export const ROOM_LIST_LIMIT = 32;

export type Grid646RawGame = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  number,
  `0x${string}`,
  number,
  bigint,
  bigint,
  number,
];

export function parseGetGameResult(gameId: bigint, raw: Grid646RawGame): Grid646GameView {
  const [playerX, playerO, stakeWei, statusNum, winner, turn, xMask, oMask, lastMoveAt] = raw;
  return {
    gameId,
    playerX,
    playerO,
    stakeWei,
    status: GRID646_STATUS[Number(statusNum)] ?? "open",
    winner,
    turn: Number(turn) === 1 ? 1 : 0,
    xMask,
    oMask,
    lastMoveAt: Number(lastMoveAt),
  };
}

export function hasPlayerO(playerO: string): boolean {
  return playerO.toLowerCase() !== ZERO_ADDRESS;
}

/** 1/0 = host only (waiting), 1/1 = both seats filled */
export function roomOccupancy(game: Pick<Grid646GameView, "playerO" | "status">): "1/0" | "1/1" {
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

export function isLiveRoom(game: Grid646GameView): boolean {
  return game.status === "open" || game.status === "active";
}

/** @deprecated use isLiveRoom */
export const isLobbyRoom = isLiveRoom;

export function isPastRoom(game: Grid646GameView): boolean {
  return game.status === "finished" || game.status === "cancelled";
}

export function sortPastRooms(a: Grid646GameView, b: Grid646GameView): number {
  return Number(b.gameId - a.gameId);
}

export function historySummary(game: Grid646GameView): string {
  if (game.status === "cancelled") {
    return isFreeStake(game.stakeWei) ? "closed · idle" : "cancelled";
  }
  if (isGameDraw(game)) return "draw";
  const mark = winnerMark(game);
  if (mark) return `${mark} won`;
  return "ended";
}

/** Join, or resume only your own live room — never spectate or reopen finished games */
export function canEnterRoom(game: Grid646GameView, wallet: string | undefined): boolean {
  if (isPastRoom(game)) return false;
  if (!wallet) return false;
  const me = wallet.toLowerCase();
  if (game.playerX.toLowerCase() === me) return true;
  return hasPlayerO(game.playerO) && game.playerO.toLowerCase() === me;
}

export function matchesPlayStyle(game: Grid646GameView, playStyle: "fun" | "money"): boolean {
  return playStyle === "fun" ? isFreeStake(game.stakeWei) : !isFreeStake(game.stakeWei);
}

export function sortLobbyRooms(a: Grid646GameView, b: Grid646GameView): number {
  const openFirst = (g: Grid646GameView) => (g.status === "open" ? 0 : 1);
  const byStatus = openFirst(a) - openFirst(b);
  if (byStatus !== 0) return byStatus;
  const byOcc = roomOccupancy(a) === "1/0" ? -1 : roomOccupancy(b) === "1/0" ? 1 : 0;
  if (byOcc !== 0) return byOcc;
  return Number(b.gameId - a.gameId);
}

export function isZeroAddress(addr: string): boolean {
  return addr.toLowerCase() === ZERO_ADDRESS;
}

export function isGameDraw(game: Pick<Grid646GameView, "status" | "winner">): boolean {
  return game.status === "finished" && isZeroAddress(game.winner);
}

export function winnerMark(
  game: Pick<Grid646GameView, "playerX" | "playerO" | "winner">
): "X" | "O" | null {
  if (isZeroAddress(game.winner)) return null;
  if (game.winner.toLowerCase() === game.playerX.toLowerCase()) return "X";
  if (hasPlayerO(game.playerO) && game.winner.toLowerCase() === game.playerO.toLowerCase()) return "O";
  return null;
}

export function statusLabel(status: Grid646Status): string {
  if (status === "open") return "waiting";
  if (status === "active") return "in play";
  return status;
}
